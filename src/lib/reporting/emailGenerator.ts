import { BRAND_COLORS, BRAND_TEXT } from './reportAssets';

/**
 * Professional HTML Email Template for Reports
 */
export function generateProfessionalReportEmail({
  title,
  subtitle,
  metrics,
  summaryText,
  ctaLink
}: {
  title: string;
  subtitle: string;
  metrics: { label: string; value: string | number; color?: string }[];
  summaryText: string;
  ctaLink: string;
}) {
  const metricHtml = metrics.map(m => `
    <div style="flex: 1; min-width: 120px; background: ${BRAND_COLORS.LIGHT}; padding: 15px; border-radius: 8px; text-align: center; margin: 5px;">
      <div style="font-size: 12px; color: ${BRAND_COLORS.MUTED}; text-transform: uppercase; font-weight: bold;">${m.label}</div>
      <div style="font-size: 24px; color: ${m.color || BRAND_COLORS.INTELLICAR_BLUE}; font-weight: bold; margin-top: 5px;">${m.value}</div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { background: ${BRAND_COLORS.DARK}; padding: 30px; text-align: center; color: #ffffff; }
        .content { padding: 40px 30px; color: #334155; line-height: 1.6; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; }
        .button { display: inline-block; padding: 14px 28px; background: ${BRAND_COLORS.INTELLICAR_BLUE}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; color: #94a3b8;">${BRAND_TEXT.CORPORATE_NAME}</div>
          <div style="font-size: 24px; font-weight: bold;">${BRAND_TEXT.PRODUCT_NAME}</div>
        </div>
        <div class="content">
          <h2 style="margin-top: 0; color: ${BRAND_COLORS.DARK};">${title}</h2>
          <p style="color: ${BRAND_COLORS.MUTED}; margin-bottom: 30px;">${subtitle}</p>
          
          <div style="display: flex; flex-wrap: wrap; margin-bottom: 30px;">
            ${metricHtml}
          </div>
          
          <div style="background: #fdf2f2; border-left: 4px solid ${BRAND_COLORS.DANGER}; padding: 15px; margin-bottom: 30px;">
            <strong style="color: ${BRAND_COLORS.DANGER};">Summary Insight:</strong><br/>
            ${summaryText}
          </div>
          
          <div style="text-align: center;">
            <a href="${ctaLink}" class="button">View Live Dashboard</a>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated system notification. Please do not reply directly to this email.</p>
          <p><strong>${BRAND_TEXT.DIVISION}</strong><br/>${BRAND_TEXT.CONFIDENTIAL_NOTICE}</p>
          <p style="margin-top: 15px;">${BRAND_TEXT.COPYRIGHT}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
