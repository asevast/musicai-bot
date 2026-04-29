import { Injectable, Logger } from '@nestjs/common';

export interface FilterResult {
  allowed: boolean;
  reason?: string;
  category?: FilterCategory;
}

export type FilterCategory =
  | 'hate_speech'
  | 'harassment'
  | 'violence'
  | 'sexual_content'
  | 'self_harm'
  | 'personal_info'
  | 'spam'
  | 'inappropriate';

interface FilterRule {
  pattern: RegExp;
  category: FilterCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

@Injectable()
export class ContentFilterService {
  private readonly logger = new Logger(ContentFilterService.name);

  // SPEC §11.4: Content filtering rules
  // Note: no 'g' flag — shared RegExp instances with 'g' leak lastIndex between calls
  private readonly rules: FilterRule[] = [
    // Violence and gore
    {
      pattern: /\b(kill(ing|er)?|murder(ing|er)?|execute|torture|die painfully|slaughter)\b/i,
      category: 'violence',
      severity: 'critical',
      message: 'Content contains references to violence or harm',
    },
    {
      pattern: /\b(blood|gore|mutilated?|decapitated?)\b/i,
      category: 'violence',
      severity: 'high',
      message: 'Content contains violent or graphic references',
    },

    // Self-harm
    {
      pattern: /\b(suicid(ing|e)|kill myself|end my life|self.harm|cutting)\b/i,
      category: 'self_harm',
      severity: 'critical',
      message: 'Content contains references to self-harm',
    },

    // Harassment and hate
    {
      pattern: /\b(hate speech|nazi|racist|derogatory slur)\b/i,
      category: 'hate_speech',
      severity: 'critical',
      message: 'Content contains hate speech',
    },
    {
      pattern: /\b(racist|sexist|homophobic|homophobe)\b/i,
      category: 'harassment',
      severity: 'high',
      message: 'Content may contain discriminatory language',
    },

    // Sexual content
    {
      pattern: /\b(nude|naked|pornographic|explicit|sexual(ly)?)\b/i,
      category: 'sexual_content',
      severity: 'high',
      message: 'Content contains sexual references',
    },

    // Personal information
    {
      pattern: /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
      category: 'personal_info',
      severity: 'medium',
      message: 'Content may contain personal information (SSN)',
    },
    {
      pattern: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/, // Phone
      category: 'personal_info',
      severity: 'low',
      message: 'Content may contain phone numbers',
    },
    {
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // Email
      category: 'personal_info',
      severity: 'low',
      message: 'Content may contain email addresses',
    },

    // Spam patterns
    {
      // Detect 5+ consecutive repeated words/phrases — ReDoS-safe alternative
      // Instead of backreference (/(.+)\1{4,}/) which causes catastrophic backtracking,
      // use a character-class quantifier with an upper bound
      pattern: /(\b\w+\b)(?:\s+\1){4,}/i,
      category: 'spam',
      severity: 'low',
      message: 'Content appears to be spam (repeated text)',
    },
    {
      pattern: /\b(buy now|click here|viagra|casino|lottery)\b/i,
      category: 'spam',
      severity: 'medium',
      message: 'Content may contain spam or promotion',
    },

    // Inappropriate for music generation
    {
      pattern: /\b(exploit(ing|ation)?|abuse|manipulat(e|ing|ion))\b/i,
      category: 'inappropriate',
      severity: 'medium',
      message: 'Content may be inappropriate',
    },
  ];

  /**
   * Check prompt against content filter rules
   * SPEC §11.4: Content filtering of prompts before Vertex AI
   */
  async checkPrompt(prompt: string): Promise<FilterResult> {
    this.logger.debug(`Checking prompt: ${prompt.slice(0, 100)}...`);

    const normalizedPrompt = prompt.toLowerCase().trim();
    const violations: { category: FilterCategory; severity: string; message: string }[] = [];

    for (const rule of this.rules) {
      if (rule.pattern.test(normalizedPrompt)) {
        violations.push({
          category: rule.category,
          severity: rule.severity,
          message: rule.message,
        });
      }
    }

    // Block on critical or high severity violations
    const criticalOrHigh = violations.filter(
      (v) => v.severity === 'critical' || v.severity === 'high'
    );

    if (criticalOrHigh.length > 0) {
      const reasons = criticalOrHigh.map((v) => `${v.category} (${v.severity})`).join(', ');
      this.logger.warn(`Prompt blocked: ${prompt.slice(0, 50)} - Violations: ${reasons}`);
      return {
        allowed: false,
        reason: criticalOrHigh[0].message,
        category: criticalOrHigh[0].category,
      };
    }

    // Log medium/low violations but allow
    if (violations.length > 0) {
      const reasons = violations.map((v) => `${v.category} (${v.severity})`).join(', ');
      this.logger.log(`Prompt flagged but allowed: ${prompt.slice(0, 50)} - Flags: ${reasons}`);
    }

    return { allowed: true };
  }

  /**
   * Check batch of prompts efficiently
   */
  async checkPrompts(prompts: string[]): Promise<FilterResult[]> {
    return Promise.all(prompts.map((p) => this.checkPrompt(p)));
  }

  /**
   * Get filter statistics
   */
  getFilterCategories(): Record<FilterCategory, string> {
    return {
      hate_speech: 'Hate speech or discriminatory content',
      harassment: 'Harassment or bullying',
      violence: 'Violence or physical harm',
      sexual_content: 'Sexual content or explicit material',
      self_harm: 'Self-harm or suicide references',
      personal_info: 'Personal information (PII)',
      spam: 'Spam or promotional content',
      inappropriate: 'Inappropriate for generation',
    };
  }
}
