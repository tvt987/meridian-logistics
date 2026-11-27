import { useMemo } from 'react';
import { generateQrMatrix } from '../engines/vietQr';

interface QrSvgProps {
  value: string;
  sizePx?: number;
  label: string;
  fgColor?: string;
  bgColor?: string;
}

export function QrSvg({
  value,
  sizePx = 156,
  label,
  fgColor = '#080c12',
  bgColor = '#ffffff',
}: QrSvgProps) {
  const { size, pathData } = useMemo(() => {
    const matrix = generateQrMatrix(value);
    const cmds: string[] = [];
    for (let r = 0; r < matrix.size; r += 1) {
      for (let c = 0; c < matrix.size; c += 1) {
        if (matrix.modules[r * matrix.size + c]) {
          cmds.push(`M${c},${r}h1v1h-1z`);
        }
      }
    }
    return { size: matrix.size, pathData: cmds.join('') };
  }, [value]);

  const quietZone = 3;
  const viewSize = size + quietZone * 2;

  return (
    <svg
      width={sizePx}
      height={sizePx}
      viewBox={`-${quietZone} -${quietZone} ${viewSize} ${viewSize}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className="block rounded-md border border-[var(--border)] bg-white"
    >
      <rect
        x={-quietZone}
        y={-quietZone}
        width={viewSize}
        height={viewSize}
        fill={bgColor}
      />
      <path d={pathData} fill={fgColor} />
    </svg>
  );
}
