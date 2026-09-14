import { Router, Request, Response } from 'express';
import { param, validationResult } from 'express-validator';
import { authenticateJWT } from '../middleware/authMiddleware';
import { requireAdmin, logAdminActivity } from '../middleware/adminMiddleware';
import prisma from '../lib/prisma';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import PptxGenJS from 'pptxgenjs';
import { toPng } from 'html-to-image';
import { v4 as uuidv4 } from 'uuid';
import { createWriteStream, existsSync } from 'fs';
import { join } from 'path';

const router = Router();
const uploadDir = process.env.UPLOAD_DIR || './uploads';

/**
 * POST /exports/pdf
 * Export assignment as PDF
 */
router.post(
  '/pdf',
  authenticateJWT,
  [param('assignmentId').isString().withMessage('Invalid assignment ID')],
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { assignmentId } = req.body;

      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: { citations: true },
      });

      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      if (assignment.userId !== req.user.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Generate PDF
      const pdfPath = join(uploadDir, `assignment-${uuidv4()}.pdf`);
      const doc = new PDFDocument();
      const stream = createWriteStream(pdfPath);

      doc.fontSize(24).text(assignment.topic || 'Assignment', { align: 'center' });
      doc.fontSize(12).text('\n');
      doc.text(assignment.generatedContent || '');

      // Add watermark
      doc.fontSize(60).opacity(0.15).text('bappu.ai', { align: 'center' });

      // Add citations
      if (assignment.citations.length > 0) {
        doc.fontSize(12).text('\nReferences:', { underline: true });
        assignment.citations.forEach((citation) => {
          doc.fontSize(10).text(`- ${citation.title}\n  ${citation.url}`);
        });
      }

      doc.pipe(stream);
      doc.end();

      // Create export record
      const exportRecord = await prisma.export.create({
        data: {
          userId: req.user.userId,
          assignmentId,
          format: 'pdf',
          fileUrl: pdfPath,
          fileName: `assignment-${uuidv4()}.pdf`,
          fileSizeMB: 0, // Calculate later
        },
      });

      res.status(200).json({
        message: 'PDF exported successfully',
        export: {
          id: exportRecord.id,
          fileName: exportRecord.fileName,
          format: 'pdf',
          downloadUrl: `/exports/download/${exportRecord.id}`,
        },
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      res.status(500).json({ error: 'Failed to export PDF' });
    }
  }
);

/**
 * POST /exports/docx
 * Export assignment as Word Document
 */
router.post(
  '/docx',
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { assignmentId } = req.body;

      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: { citations: true },
      });

      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      if (assignment.userId !== req.user.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Generate DOCX
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                text: assignment.topic || 'Assignment',
                size: 48,
                bold: true,
              }),
              new Paragraph({
                text: assignment.generatedContent || '',
                size: 24,
              }),
              new Paragraph({ text: '\nReferences:', bold: true }),
              ...assignment.citations.map(
                (citation) =>
                  new Paragraph({
                    text: `${citation.title} - ${citation.url}`,
                    size: 20,
                  })
              ),
            ],
          },
        ],
      });

      const docxPath = join(uploadDir, `assignment-${uuidv4()}.docx`);
      const bytes = await Packer.toBuffer(doc);
      const fs = require('fs');
      fs.writeFileSync(docxPath, bytes);

      // Create export record
      const exportRecord = await prisma.export.create({
        data: {
          userId: req.user.userId,
          assignmentId,
          format: 'docx',
          fileUrl: docxPath,
          fileName: `assignment-${uuidv4()}.docx`,
          fileSizeMB: bytes.length / (1024 * 1024),
        },
      });

      res.status(200).json({
        message: 'Word document exported successfully',
        export: {
          id: exportRecord.id,
          fileName: exportRecord.fileName,
          format: 'docx',
          downloadUrl: `/exports/download/${exportRecord.id}`,
        },
      });
    } catch (error) {
      console.error('Error exporting DOCX:', error);
      res.status(500).json({ error: 'Failed to export document' });
    }
  }
);

/**
 * POST /exports/pptx
 * Export assignment as PowerPoint Presentation
 */
router.post(
  '/pptx',
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { assignmentId } = req.body;

      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: { citations: true },
      });

      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      if (assignment.userId !== req.user.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Generate PPTX
      const prs = new PptxGenJS();
      prs.defineLayout({ name: 'TITLE_SLIDE', master: 'BLANK' });

      // Title Slide
      let slide = prs.addSlide();
      slide.background = { color: '1a1a2e' };
      slide.addText(assignment.topic || 'Assignment', {
        x: 0.5,
        y: 2.0,
        w: 9,
        h: 1,
        fontSize: 44,
        bold: true,
        color: 'ffffff',
      });

      // Watermark
      slide.addText('bappu.ai', {
        x: 3.5,
        y: 4.0,
        w: 3,
        h: 1,
        fontSize: 60,
        color: 'cccccc',
        opacity: 0.15,
        align: 'center',
      });

      // Content Slide
      slide = prs.addSlide();
      slide.background = { color: 'ffffff' };
      slide.addText('Content', {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.5,
        fontSize: 32,
        bold: true,
      });
      slide.addText(assignment.generatedContent || '', {
        x: 0.5,
        y: 1.2,
        w: 9,
        h: 4.5,
        fontSize: 14,
      });

      // Save PPTX
      const pptxPath = join(uploadDir, `assignment-${uuidv4()}.pptx`);
      await prs.writeFile({ fileName: pptxPath });

      // Create export record
      const exportRecord = await prisma.export.create({
        data: {
          userId: req.user.userId,
          assignmentId,
          format: 'pptx',
          fileUrl: pptxPath,
          fileName: `assignment-${uuidv4()}.pptx`,
          fileSizeMB: 0,
        },
      });

      res.status(200).json({
        message: 'Presentation exported successfully',
        export: {
          id: exportRecord.id,
          fileName: exportRecord.fileName,
          format: 'pptx',
          downloadUrl: `/exports/download/${exportRecord.id}`,
        },
      });
    } catch (error) {
      console.error('Error exporting PPTX:', error);
      res.status(500).json({ error: 'Failed to export presentation' });
    }
  }
);

/**
 * GET /exports/download/:exportId
 * Download export file
 */
router.get(
  '/download/:exportId',
  async (req: Request, res: Response) => {
    try {
      const { exportId } = req.params;

      const exportRecord = await prisma.export.findUnique({
        where: { id: exportId },
      });

      if (!exportRecord) {
        return res.status(404).json({ error: 'Export not found' });
      }

      // Check if file is public or user owns it
      if (
        !exportRecord.isPublic &&
        exportRecord.userId !== req.user?.userId
      ) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      res.download(exportRecord.fileUrl, exportRecord.fileName);
    } catch (error) {
      console.error('Error downloading export:', error);
      res.status(500).json({ error: 'Failed to download file' });
    }
  }
);

export default router;
