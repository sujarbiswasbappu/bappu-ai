import { Router, Request, Response } from 'express';
import { body, validationResult, param } from 'express-validator';
import { authenticateJWT } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';
import { upload } from '../lib/multer';
import Tesseract from 'tesseract.js';
import axios from 'axios';

const router = Router();

/**
 * POST /assignments/generate
 * Generate assignment from text prompt or image
 */
router.post(
  '/generate',
  authenticateJWT,
  upload.single('image'),
  [
    body('inputType')
      .isIn(['text', 'image'])
      .withMessage('Input type must be text or image'),
    body('textPrompt')
      .if(() => body('inputType').equals('text'))
      .trim()
      .notEmpty()
      .withMessage('Text prompt is required'),
    body('topic').trim().optional(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { inputType, textPrompt, topic } = req.body;

      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Create assignment record
      let assignment = await prisma.assignment.create({
        data: {
          userId: req.user.userId,
          inputType,
          textPrompt: inputType === 'text' ? textPrompt : undefined,
          topic,
          status: 'processing',
        },
      });

      // Process image if provided
      let extractedText = '';
      if (inputType === 'image' && req.file) {
        try {
          const result = await Tesseract.recognize(req.file.path, 'eng');
          extractedText = result.data.text;
          assignment = await prisma.assignment.update({
            where: { id: assignment.id },
            data: {
              imageUrl: req.file.filename,
              extractedText,
            },
          });
        } catch (error) {
          console.error('OCR Error:', error);
          return res.status(400).json({ error: 'Failed to process image' });
        }
      }

      // Generate assignment using AI + research
      const prompt = inputType === 'text' ? textPrompt : extractedText || '';
      const generatedContent = await generateAssignmentContent(prompt);

      // Fetch citations from research APIs
      const citations = await fetchCitations(prompt);

      // Update assignment
      assignment = await prisma.assignment.update({
        where: { id: assignment.id },
        data: {
          generatedContent,
          status: 'completed',
          wordCount: generatedContent.split(' ').length,
          estimatedReadTime: Math.ceil(generatedContent.split(' ').length / 200),
        },
      });

      // Create citations
      for (const citation of citations) {
        await prisma.citation.create({
          data: {
            assignmentId: assignment.id,
            ...citation,
          },
        });
      }

      // Update user metrics
      await prisma.user.update({
        where: { id: req.user.userId },
        data: {
          totalAssignmentsGenerated: {
            increment: 1,
          },
        },
      });

      res.status(200).json({
        message: 'Assignment generated successfully',
        assignment: {
          id: assignment.id,
          topic: assignment.topic,
          wordCount: assignment.wordCount,
          estimatedReadTime: assignment.estimatedReadTime,
          status: assignment.status,
        },
        content: generatedContent,
        citations: citations.map((c) => ({
          title: c.title,
          url: c.url,
          sourceType: c.sourceType,
        })),
      });
    } catch (error) {
      console.error('Error generating assignment:', error);
      res.status(500).json({ error: 'Failed to generate assignment' });
    }
  }
);

/**
 * GET /assignments/:id
 * Retrieve assignment by ID
 */
router.get(
  '/:id',
  authenticateJWT,
  [param('id').isString().withMessage('Invalid assignment ID')],
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const assignment = await prisma.assignment.findUnique({
        where: { id },
        include: { citations: true },
      });

      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      // Ensure user owns this assignment
      if (assignment.userId !== req.user.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      res.status(200).json({ assignment });
    } catch (error) {
      console.error('Error retrieving assignment:', error);
      res.status(500).json({ error: 'Failed to retrieve assignment' });
    }
  }
);

/**
 * GET /assignments
 * List user's assignments
 */
router.get('/', authenticateJWT, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { page = '1', limit = '10' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const assignments = await prisma.assignment.findMany({
      where: { userId: req.user.userId },
      skip,
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        topic: true,
        status: true,
        wordCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const total = await prisma.assignment.count({
      where: { userId: req.user.userId },
    });

    res.status(200).json({
      assignments,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Error listing assignments:', error);
    res.status(500).json({ error: 'Failed to list assignments' });
  }
});

/**
 * Helper: Generate assignment content using OpenAI API
 */
async function generateAssignmentContent(prompt: string): Promise<string> {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert academic writing assistant. Generate comprehensive, well-researched assignments with proper citations and structure.',
          },
          {
            role: 'user',
            content: `Generate a detailed assignment on the following topic: ${prompt}`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error generating content:', error);
    return 'Failed to generate assignment content. Please try again.';
  }
}

/**
 * Helper: Fetch citations from research APIs
 */
async function fetchCitations(
  query: string
): Promise<
  Array<{
    title: string;
    authors?: string;
    url: string;
    sourceType: string;
    publishedDate?: Date;
    abstract?: string;
  }>
> {
  try {
    const citations = [];

    // Fetch from SerpAPI (Google Search)
    if (process.env.SERPAPI_API_KEY) {
      const googleResponse = await axios.get('https://serpapi.com/search', {
        params: {
          q: query,
          api_key: process.env.SERPAPI_API_KEY,
          num: 5,
        },
      });

      if (googleResponse.data.organic_results) {
        for (const result of googleResponse.data.organic_results.slice(0, 3)) {
          citations.push({
            title: result.title,
            url: result.link,
            sourceType: 'web',
          });
        }
      }
    }

    return citations;
  } catch (error) {
    console.error('Error fetching citations:', error);
    return [];
  }
}

export default router;
