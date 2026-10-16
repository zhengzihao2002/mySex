import { renderIcon } from '@/lib/icon';

export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  return renderIcon(size === '192' ? 192 : 512);
}
