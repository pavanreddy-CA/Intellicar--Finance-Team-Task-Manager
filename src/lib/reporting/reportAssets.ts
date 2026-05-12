/**
 * reportAssets.ts
 * Centralized branding assets and style tokens for reports.
 * Used by Excel, PDF, and Email generators.
 */

export const BRAND_COLORS = {
  INTELLICAR_BLUE: '#4F46E5', // Indigo-600
  FINPULSE_BLUE: '#3B82F6',    // Blue-500
  SUCCESS: '#10B981',         // Emerald-500
  WARNING: '#F59E0B',         // Amber-500
  DANGER: '#EF4444',          // Red-500
  MUTED: '#64748B',           // Slate-500
  DARK: '#1E293B',            // Slate-800
  LIGHT: '#F8FAFC',           // Slate-50
  WHITE: '#FFFFFF'
};

export const BRAND_TEXT = {
  CORPORATE_NAME: 'Intellicar Telematics Pvt. Ltd.',
  PRODUCT_NAME: 'FinPulse Management System',
  DIVISION: 'Finance & Analytics Division',
  CONFIDENTIAL_NOTICE: 'CONFIDENTIAL: For internal use only. Authorized access required.',
  COPYRIGHT: `© ${new Date().getFullYear()} Intellicar Telematics Pvt. Ltd.`,
  POWERED_BY: 'Powered by FinPulse Core v2.0'
};

// SVG Data URIs for Logos (Placeholders - will be used as background images if needed)
export const LOGO_PLACEHOLDERS = {
  // We can use these for PDF/Excel if no real image is provided
  BRAND_CIRCLE: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxOCIgc3Ryb2tlPSIjNEY0NkU1IiBzdHJva2Utd2lkdGg9IjQiLz48cGF0aCBkPSJNMTEgMjBMMTcgMjZMMjkgMTQiIHN0cm9rZT0iIzRGNDZFNSIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4='
};

export const REPORT_FONTS = {
  PRIMARY: 'Helvetica',
  SECONDARY: 'Helvetica-Bold'
};
