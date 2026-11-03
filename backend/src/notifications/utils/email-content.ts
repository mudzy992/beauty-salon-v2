import sanitizeHtml from 'sanitize-html';
import { escapeEmailHtml } from './email-template';

const EMAIL_TAGS = [
  'a',
  'b',
  'br',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'hr',
  'i',
  'img',
  'li',
  'ol',
  'p',
  'span',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
];

const EMAIL_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  '*': ['style', 'title', 'align', 'valign', 'width', 'height'],
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt'],
  table: ['cellpadding', 'cellspacing', 'border', 'role'],
  td: ['colspan', 'rowspan', 'bgcolor'],
  th: ['colspan', 'rowspan', 'bgcolor'],
};

const EMAIL_STYLES: sanitizeHtml.IOptions['allowedStyles'] = {
  '*': {
    color: [/^#[\da-f]{3,8}$/i],
    'background-color': [/^#[\da-f]{3,8}$/i],
    'font-family': [
      /^(?:Arial|Helvetica|sans-serif|Georgia|serif)(?:\s*,\s*(?:Arial|Helvetica|sans-serif|Georgia|serif))*$/i,
    ],
    'font-size': [/^\d{1,3}(?:px|pt|em|rem|%)$/i],
    'font-weight': [/^(?:normal|bold|[1-9]00)$/i],
    'line-height': [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)?$/i],
    'text-align': [/^(?:left|center|right|justify)$/i],
    'text-decoration': [/^(?:none|underline)$/i],
    display: [/^(?:block|inline|inline-block|table|table-cell)$/i],
    margin: [
      /^\d{1,3}(?:px|pt|em|rem|%)?(?:\s+\d{1,3}(?:px|pt|em|rem|%)?){0,3}$/i,
    ],
    'margin-top': [/^\d{1,3}(?:px|pt|em|rem|%)?$/i],
    'margin-right': [/^\d{1,3}(?:px|pt|em|rem|%)?$/i],
    'margin-bottom': [/^\d{1,3}(?:px|pt|em|rem|%)?$/i],
    'margin-left': [/^\d{1,3}(?:px|pt|em|rem|%)?$/i],
    padding: [
      /^\d{1,3}(?:px|pt|em|rem|%)?(?:\s+\d{1,3}(?:px|pt|em|rem|%)?){0,3}$/i,
    ],
    'padding-top': [/^\d{1,3}(?:px|pt|em|rem|%)?$/i],
    'padding-right': [/^\d{1,3}(?:px|pt|em|rem|%)?$/i],
    'padding-bottom': [/^\d{1,3}(?:px|pt|em|rem|%)?$/i],
    'padding-left': [/^\d{1,3}(?:px|pt|em|rem|%)?$/i],
    border: [/^\d{1,2}px\s+solid\s+#[\da-f]{3,8}$/i],
    'border-radius': [/^\d{1,3}px$/i],
    'max-width': [/^\d{1,4}px$/i],
  },
};

const EMAIL_SANITIZER_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: EMAIL_TAGS,
  allowedAttributes: EMAIL_ATTRIBUTES,
  allowedStyles: EMAIL_STYLES,
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    img: ['http', 'https'],
  },
  allowProtocolRelative: false,
  enforceHtmlBoundary: true,
  transformTags: {
    a: (_tagName, attributes) => ({
      tagName: 'a',
      attribs: { ...attributes, rel: 'noreferrer noopener' },
    }),
  },
};

export interface CampaignEmailVariables {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  appUrl: string;
}

export function sanitizeCampaignEmailHtml(html: string): string {
  return sanitizeHtml(html, EMAIL_SANITIZER_OPTIONS);
}

export function renderCampaignEmailHtml(
  template: string,
  variables: CampaignEmailVariables,
): string {
  const replacements: Record<keyof CampaignEmailVariables, string> = {
    firstName: variables.firstName,
    lastName: variables.lastName,
    username: variables.username,
    email: variables.email,
    appUrl: variables.appUrl,
  };
  let personalized = template;
  for (const [key, value] of Object.entries(replacements)) {
    const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    personalized = personalized.replace(placeholder, () =>
      escapeEmailHtml(value),
    );
  }
  return sanitizeCampaignEmailHtml(personalized);
}
