import QRCode from 'qrcode';
import { VIETQR_CONFIG } from '../data/corridors';

function formatTlv(tag: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * ISO/IEC 13239 CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) required by EMVCo / VietQR.
 */
export function computeCrc16Ccitt(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generates an authentic NAPAS 247 / VietQR EMVCo payload for Techcombank (970407 / 19077742964012).
 */
export function buildVietQrPayload(amountVnd: number, memo: string): string {
  const cleanMemo = memo
    .replace(/[^A-Za-z0-9 -]/g, '')
    .trim()
    .slice(0, 40);

  const beneficiaryInfo =
    formatTlv('00', VIETQR_CONFIG.bankBin) +
    formatTlv('01', VIETQR_CONFIG.accountNumber);

  const merchantAccountInfo =
    formatTlv('00', 'A000000727') +
    formatTlv('01', beneficiaryInfo) +
    formatTlv('02', 'QRIBFTTA');

  const additionalData = cleanMemo ? formatTlv('08', cleanMemo) : '';

  const basePayload = [
    formatTlv('00', '01'),
    formatTlv('01', amountVnd > 0 ? '12' : '11'),
    formatTlv('38', merchantAccountInfo),
    formatTlv('53', '704'),
    amountVnd > 0 ? formatTlv('54', String(Math.round(amountVnd))) : '',
    formatTlv('58', 'VN'),
    additionalData ? formatTlv('62', additionalData) : '',
    '6304',
  ].join('');

  return `${basePayload}${computeCrc16Ccitt(basePayload)}`;
}

/**
 * Synchronously generates a crisp offline QR matrix with zero external API calls.
 */
export function generateQrMatrix(content: string): {
  size: number;
  modules: boolean[];
} {
  const qr = QRCode.create(content, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const modules: boolean[] = [];
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      modules.push(Boolean(qr.modules.get(r, c)));
    }
  }
  return { size, modules };
}
