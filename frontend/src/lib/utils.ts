import clsx from 'clsx';

export { clsx };

export const cn = (...classes: (string | undefined | null | false)[]) => {
  return clsx(classes);
};
