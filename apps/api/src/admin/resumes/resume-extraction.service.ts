import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';

export interface ExtractedWorkExperienceItem {
  company: string;
  jobTitle?: string;
  startDate?: Date;
  endDate?: Date;
  isCurrent: boolean;
}

export interface ExtractedEducationItem {
  qualification: string;
  institution?: string;
  startYear?: number;
  endYear?: number;
}

export interface ExtractedCertificationItem {
  name: string;
  issuer?: string;
  issueYear?: number;
}

export interface ExtractedCareerPreferences {
  noticePeriod?: string;
  workPreference?: string;
  preferredRole?: string;
  preferredLocation?: string;
}

export interface ExtractedResumeData {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  totalExperienceMonths?: number;
  currentJobTitle?: string;
  currentCompany?: string;
  careerPreferences?: ExtractedCareerPreferences;
  skills: string[];
  workExperience: ExtractedWorkExperienceItem[];
  education: ExtractedEducationItem[];
  certifications: ExtractedCertificationItem[];
  industries: string[];
  functionalAreas: string[];
  rawText: string;
}

export interface AiResumeParseResult {
  data: ExtractedResumeData;
  parserVersion: string;
}

const REGEX_PARSER_VERSION = 'regex-v2';
const OPENAI_EXTRACTION_TIMEOUT_MS = 9000;

@Injectable()
export class ResumeExtractionService {
  private readonly logger = new Logger(ResumeExtractionService.name);

  constructor(@Optional() private readonly config?: ConfigService) {}

  async extractText(buffer: Buffer, fileType: string): Promise<string> {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return this.extractFromPdf(buffer);
      case 'docx':
        return this.extractFromDocx(buffer);
      case 'doc':
        return this.extractFromDoc(buffer);
      default:
        throw new Error(`Unsupported file type for extraction: ${fileType}`);
    }
  }

  private async extractFromPdf(buffer: Buffer): Promise<string> {
    try {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      return result.text || '';
    } catch (error) {
      this.logger.error('PDF extraction failed', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  private async extractFromDocx(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (error) {
      this.logger.error('DOCX extraction failed', error);
      throw new Error('Failed to extract text from DOCX');
    }
  }

  private async extractFromDoc(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (error) {
      this.logger.warn('DOC extraction failed, mammoth may not fully support .doc format', error);
      throw new Error('Failed to extract text from DOC. Please convert to DOCX or PDF.');
    }
  }

  /**
   * Uses OpenAI structured JSON extraction when OPENAI_API_KEY is available,
   * automatically falling back to deterministic regex parsing so uploads
   * never fail due to missing keys or external API timeouts.
   */
  async parseResumeWithAi(text: string): Promise<AiResumeParseResult> {
    const baseline = this.parseResumeText(text);
    const apiKey = (
      this.config?.get<string>('OPENAI_API_KEY') ??
      process.env.OPENAI_API_KEY ??
      ''
    ).trim();

    if (!apiKey || baseline.rawText.length < 40) {
      return { data: baseline, parserVersion: REGEX_PARSER_VERSION };
    }

    const model =
      (this.config?.get<string>('OPENAI_MODEL') ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini')
        .trim() || 'gpt-4o-mini';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENAI_EXTRACTION_TIMEOUT_MS);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          max_tokens: 1400,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: [
                'You are a precision executive resume parser. Extract structured candidate information from the CV text and return ONLY valid JSON matching this schema:',
                '{',
                '  "fullName": string | null,',
                '  "email": string | null,',
                '  "phone": string | null,',
                '  "location": string | null,',
                '  "yearsExperience": number | null,',
                '  "monthsExperience": number | null,',
                '  "currentJobTitle": string | null,',
                '  "currentCompany": string | null,',
                '  "careerPreferences": {',
                '    "noticePeriod": "Immediate" | "15 Days" | "30 Days" | "60 Days" | "Serving Notice" | null,',
                '    "workPreference": "Hybrid (Preferred)" | "In-Office / On-Site" | "Remote Only" | null,',
                '    "preferredRole": string | null,',
                '    "preferredLocation": string | null',
                '  },',
                '  "skills": string[],',
                '  "workExperience": [{ "company": string, "jobTitle": string | null, "startYear": number | null, "endYear": number | null, "isCurrent": boolean }],',
                '  "education": [{ "qualification": string, "institution": string | null, "startYear": number | null, "endYear": number | null }],',
                '  "certifications": [{ "name": string, "issuer": string | null, "issueYear": number | null }],',
                '  "industries": string[],',
                '  "functionalAreas": string[]',
                '}',
                'Rules: Extract currentJobTitle, currentCompany, total yearsExperience & monthsExperience, and careerPreferences directly from the CV. For preferredRole, extract explicit objective/target roles or derive concise target role titles from the candidate career trajectory. For preferredLocation, extract stated preferred cities/countries or current base location/relocation regions. Only set noticePeriod/workPreference when mentioned or clearly implied; use the exact allowed enum labels.',
              ].join('\n'),
            },
            {
              role: 'user',
              content: baseline.rawText.slice(0, 12000),
            },
          ],
        }),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        this.logger.warn(`OpenAI resume parse returned ${response.status}: ${errBody.slice(0, 200)}`);
        return { data: baseline, parserVersion: REGEX_PARSER_VERSION };
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const rawJson = payload?.choices?.[0]?.message?.content;
      if (!rawJson) {
        return { data: baseline, parserVersion: REGEX_PARSER_VERSION };
      }

      const parsed = JSON.parse(rawJson) as Record<string, any>;
      const merged = this.mergeAiAndRegex(parsed, baseline);
      return { data: merged, parserVersion: `openai-${model}` };
    } catch (error: any) {
      this.logger.warn(
        `AI resume parsing fell back to regex: ${error?.name === 'AbortError' ? 'timeout' : error?.message || error}`,
      );
      return { data: baseline, parserVersion: REGEX_PARSER_VERSION };
    } finally {
      clearTimeout(timeout);
    }
  }

  private mergeAiAndRegex(ai: Record<string, any>, fallback: ExtractedResumeData): ExtractedResumeData {
    const strOr = (val: unknown, alt?: string, maxLen = 255): string | undefined => {
      if (typeof val === 'string') {
        const cleaned = val.trim();
        if (cleaned.length > 0 && cleaned.toLowerCase() !== 'null' && cleaned.toLowerCase() !== 'n/a') {
          return cleaned.slice(0, maxLen);
        }
      }
      return alt;
    };

    const strArray = (val: unknown, alt: string[], maxItems = 30): string[] => {
      if (Array.isArray(val)) {
        const cleaned = [
          ...new Set(
            val
              .filter((item): item is string => typeof item === 'string')
              .map((item) => item.trim())
              .filter((item) => item.length > 1 && item.length <= 80),
          ),
        ].slice(0, maxItems);
        if (cleaned.length > 0) return cleaned;
      }
      return alt;
    };

    const safeYear = (val: unknown): number | undefined => {
      const n = Number(val);
      if (Number.isInteger(n) && n >= 1950 && n <= 2100) return n;
      return undefined;
    };

    let totalMonths = fallback.totalExperienceMonths;
    const rawYears = Number(ai.yearsExperience);
    const rawMonths = Number(ai.monthsExperience);
    if (Number.isFinite(rawYears) && rawYears >= 0 && rawYears <= 70) {
      const wholeYears = Math.floor(rawYears);
      const extraMonths =
        Number.isFinite(rawMonths) && rawMonths >= 0 && rawMonths <= 11
          ? Math.floor(rawMonths)
          : Math.round((rawYears - wholeYears) * 12);
      totalMonths = wholeYears * 12 + Math.min(11, Math.max(0, extraMonths));
    }

    const workExperience: ExtractedWorkExperienceItem[] = Array.isArray(ai.workExperience)
      ? ai.workExperience
          .filter((w) => w && typeof w.company === 'string' && w.company.trim().length > 0)
          .slice(0, 12)
          .map((w) => {
            const startY = safeYear(w.startYear);
            const endY = safeYear(w.endYear);
            return {
              company: String(w.company).trim().slice(0, 200),
              jobTitle: strOr(w.jobTitle, undefined, 200),
              startDate: startY ? new Date(Date.UTC(startY, 0, 1)) : undefined,
              endDate: !w.isCurrent && endY ? new Date(Date.UTC(endY, 11, 31)) : undefined,
              isCurrent: Boolean(w.isCurrent),
            };
          })
      : [];

    const education: ExtractedEducationItem[] = Array.isArray(ai.education)
      ? ai.education
          .filter((e) => e && typeof e.qualification === 'string' && e.qualification.trim().length > 0)
          .slice(0, 8)
          .map((e) => ({
            qualification: String(e.qualification).trim().slice(0, 200),
            institution: strOr(e.institution, undefined, 200),
            startYear: safeYear(e.startYear),
            endYear: safeYear(e.endYear),
          }))
      : [];

    const certifications: ExtractedCertificationItem[] = Array.isArray(ai.certifications)
      ? ai.certifications
          .filter((c) => c && typeof c.name === 'string' && c.name.trim().length > 0)
          .slice(0, 10)
          .map((c) => ({
            name: String(c.name).trim().slice(0, 200),
            issuer: strOr(c.issuer, undefined, 200),
            issueYear: safeYear(c.issueYear),
          }))
      : [];

    const aiEmail = strOr(ai.email, undefined, 254)?.toLowerCase();
    const resolvedWorkExperience =
      workExperience.length > 0 ? workExperience : fallback.workExperience;
    const latestWork =
      resolvedWorkExperience.find((w) => w.isCurrent) ?? resolvedWorkExperience[0];

    const resolvedJobTitle = strOr(
      ai.currentJobTitle,
      latestWork?.jobTitle ?? fallback.currentJobTitle,
      255,
    );
    const resolvedCompany = strOr(
      ai.currentCompany,
      latestWork?.company ?? fallback.currentCompany,
      255,
    );
    const resolvedLocation = strOr(ai.location, fallback.location, 255);

    const aiPrefs =
      ai.careerPreferences && typeof ai.careerPreferences === 'object' ? ai.careerPreferences : {};
    const careerPreferences: ExtractedCareerPreferences = {
      noticePeriod:
        this.normalizeNoticePeriod(aiPrefs.noticePeriod) ?? fallback.careerPreferences?.noticePeriod,
      workPreference:
        this.normalizeWorkPreference(aiPrefs.workPreference) ??
        fallback.careerPreferences?.workPreference,
      preferredRole: strOr(
        aiPrefs.preferredRole,
        fallback.careerPreferences?.preferredRole ?? resolvedJobTitle,
        200,
      ),
      preferredLocation: strOr(
        aiPrefs.preferredLocation,
        fallback.careerPreferences?.preferredLocation ?? resolvedLocation,
        200,
      ),
    };

    return {
      fullName: strOr(ai.fullName, fallback.fullName, 200),
      email: aiEmail && aiEmail.includes('@') ? aiEmail : fallback.email,
      phone: strOr(ai.phone, fallback.phone, 50),
      location: resolvedLocation,
      totalExperienceMonths: totalMonths,
      currentJobTitle: resolvedJobTitle,
      currentCompany: resolvedCompany,
      careerPreferences,
      skills: strArray(ai.skills, fallback.skills, 30),
      workExperience: resolvedWorkExperience,
      education: education.length > 0 ? education : fallback.education,
      certifications: certifications.length > 0 ? certifications : fallback.certifications,
      industries: strArray(ai.industries, fallback.industries, 15),
      functionalAreas: strArray(ai.functionalAreas, fallback.functionalAreas, 15),
      rawText: fallback.rawText,
    };
  }

  private normalizeNoticePeriod(raw: unknown): string | undefined {
    if (typeof raw !== 'string') return undefined;
    const s = raw.toLowerCase();
    if (/immediate|immediately|0\s*days|now/.test(s)) return 'Immediate';
    if (/15\s*days|2\s*weeks|two\s*weeks/.test(s)) return '15 Days';
    if (/30\s*days|1\s*month|one\s*month/.test(s)) return '30 Days';
    if (/60\s*days|90\s*days|2\s*months|3\s*months/.test(s)) return '60 Days';
    if (/serving/.test(s)) return 'Serving Notice';
    return undefined;
  }

  private normalizeWorkPreference(raw: unknown): string | undefined {
    if (typeof raw !== 'string') return undefined;
    const s = raw.toLowerCase();
    if (/hybrid/.test(s)) return 'Hybrid (Preferred)';
    if (/remote|work from home|wfh/.test(s)) return 'Remote Only';
    if (/on[\s-]?site|in[\s-]?office/.test(s)) return 'In-Office / On-Site';
    return undefined;
  }

  parseResumeText(text: string): ExtractedResumeData {
    const cleanedText = this.cleanText(text);
    const lines = cleanedText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const data: ExtractedResumeData = {
      skills: [],
      workExperience: [],
      education: [],
      certifications: [],
      industries: [],
      functionalAreas: [],
      rawText: cleanedText,
    };

    data.email = this.extractEmail(cleanedText);
    data.phone = this.extractPhone(cleanedText);
    data.fullName = this.extractName(lines);
    data.location = this.extractLocation(cleanedText);
    data.workExperience = this.extractWorkExperience(cleanedText);
    data.totalExperienceMonths =
      this.extractTotalExperience(cleanedText) ?? this.estimateExperienceFromTextDates(cleanedText);
    const firstWork = data.workExperience.find((w) => w.isCurrent) ?? data.workExperience[0];
    data.currentJobTitle = this.extractCurrentJobTitle(lines) ?? firstWork?.jobTitle;
    data.currentCompany = this.extractCurrentCompany(lines) ?? firstWork?.company;
    data.skills = this.extractSkills(cleanedText);
    data.education = this.extractEducation(cleanedText);
    data.certifications = this.extractCertifications(cleanedText);
    data.industries = this.extractIndustries(cleanedText);
    data.functionalAreas = this.extractFunctionalAreas(cleanedText);
    data.careerPreferences = this.extractCareerPreferences(cleanedText, data);

    return data;
  }

  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/\n\s+\n/g, '\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private extractEmail(text: string): string | undefined {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
    const match = text.match(emailRegex);
    return match?.[0]?.toLowerCase();
  }

  private extractPhone(text: string): string | undefined {
    const phoneRegex = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{4,5}/g;
    const matches = text.match(phoneRegex) || [];
    for (const raw of matches) {
      const digits = raw.replace(/\D/g, '');
      if (digits.length >= 10 && digits.length <= 15) {
        return raw.trim();
      }
    }
    return undefined;
  }

  private extractName(lines: string[]): string | undefined {
    for (const line of lines.slice(0, 6)) {
      if (
        line.length > 2 &&
        line.length < 60 &&
        !line.includes('@') &&
        !line.includes('http') &&
        !/resume|curriculum vitae|\bcv\b/i.test(line) &&
        !/^\+?\d/.test(line) &&
        /[A-Za-z]/.test(line)
      ) {
        return line;
      }
    }
    return undefined;
  }

  private extractLocation(text: string): string | undefined {
    const locationPatterns = [
      /(?:Location|Address|Based in|City)[:\s]+([A-Za-z][A-Za-z\s,.-]{2,50})/i,
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*(?:India|UAE|UK|USA|Singapore|Dubai|Abu Dhabi|London|[A-Z]{2}))\b/,
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*[A-Z][a-z]+\b/,
    ];

    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return match[1].trim().replace(/[,\s]+$/, '');
      }
    }
    return undefined;
  }

  private extractTotalExperience(text: string): number | undefined {
    const yearsAndMonths = text.match(
      /(\d{1,2})\+?\s*(?:years?|yrs?)\s*(?:and|,)?\s*(\d{1,2})\s*(?:months?|mos?)/i,
    );
    if (yearsAndMonths) {
      const y = parseInt(yearsAndMonths[1], 10);
      const m = parseInt(yearsAndMonths[2], 10);
      if (y >= 0 && y < 55 && m >= 0 && m < 12) {
        return y * 12 + m;
      }
    }

    const patterns = [
      /(\d+(?:\.\d+)?)\+?\s*years?\s*(?:of)?\s*experience/i,
      /experience[:\s]+(\d+(?:\.\d+)?)\+?\s*years?/i,
      /(\d+(?:\.\d+)?)\+?\s*yrs?\s*(?:of)?\s*(?:exp|experience)/i,
      /total\s*experience[:\s]*(\d+(?:\.\d+)?)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const years = parseFloat(match[1]);
        if (years > 0 && years < 55) {
          return Math.round(years * 12);
        }
      }
    }
    return undefined;
  }

  private estimateExperienceFromTextDates(text: string): number | undefined {
    const matches = [...text.matchAll(/\b(19[89]\d|20[0-2]\d)\s*(?:[-–—]|to)\s*(20[0-2]\d|present|current|till\s*date)\b/gi)];
    if (matches.length === 0) return undefined;
    const currentYear = new Date().getFullYear();
    let minStart = currentYear;
    let maxEnd = 0;
    for (const m of matches) {
      const s = parseInt(m[1], 10);
      const endRaw = m[2].toLowerCase();
      const e = /present|current|till/.test(endRaw) ? currentYear : parseInt(endRaw, 10);
      if (s < minStart) minStart = s;
      if (e > maxEnd) maxEnd = e;
    }
    const years = maxEnd - minStart;
    if (years >= 1 && years <= 45) {
      return years * 12;
    }
    return undefined;
  }

  private extractCareerPreferences(
    text: string,
    extracted: ExtractedResumeData,
  ): ExtractedCareerPreferences {
    const noticeMatch = text.match(
      /(?:notice\s*period|availability)[:\s-]*([^\n,;]{2,40})/i,
    );
    const noticeRaw = noticeMatch?.[1] ?? text;
    const noticePeriod = this.normalizeNoticePeriod(noticeRaw);

    const workModeMatch = text.match(
      /(?:work\s*(?:mode|preference|type)|location\s*preference)[:\s-]*([^\n,;]{2,40})/i,
    );
    const workPreference =
      this.normalizeWorkPreference(workModeMatch?.[1] ?? text);

    const targetRoleMatch = text.match(
      /(?:target\s*role|career\s*objective|seeking\s*role|desired\s*role|preferred\s*role)[:\s-]*([^\n]{3,90})/i,
    );
    const preferredRole =
      targetRoleMatch?.[1]?.trim() ||
      extracted.currentJobTitle ||
      undefined;

    const targetLocMatch = text.match(
      /(?:preferred\s*location|target\s*locations?|relocat(?:e|ion)\s*to)[:\s-]*([^\n]{2,90})/i,
    );
    const preferredLocation =
      targetLocMatch?.[1]?.trim() ||
      extracted.location ||
      undefined;

    return {
      noticePeriod,
      workPreference,
      preferredRole,
      preferredLocation,
    };
  }

  private extractCurrentJobTitle(lines: string[]): string | undefined {
    const titleKeywords = [
      'software',
      'engineer',
      'developer',
      'manager',
      'director',
      'vice president',
      'president',
      'chief',
      'head',
      'lead',
      'architect',
      'analyst',
      'consultant',
      'specialist',
      'officer',
    ];
    for (const line of lines.slice(0, 20)) {
      const lower = line.toLowerCase();
      if (titleKeywords.some((k) => lower.includes(k)) && line.length < 80) {
        return line;
      }
    }
    return undefined;
  }

  private extractCurrentCompany(lines: string[]): string | undefined {
    const companyPatterns = [
      /(?:currently at|working at|employed at)[:\s]+([A-Za-z0-9\s&.]+)/i,
      /(?:present|current)[:\s]*([A-Za-z0-9\s&.]+)/i,
    ];

    for (const line of lines.slice(0, 20)) {
      for (const pattern of companyPatterns) {
        const match = line.match(pattern);
        if (match?.[1]) {
          return match[1].trim();
        }
      }
    }
    return undefined;
  }

  private extractSkills(text: string): string[] {
    const skills: string[] = [];
    const skillSectionPatterns = [
      /(?:skills|technologies|tech stack|competencies)[:\s]+([\s\S]{0,500})/i,
      /(?:proficient in|expertise in|knowledge of)[:\s]+([\s\S]{0,300})/i,
    ];

    for (const pattern of skillSectionPatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const skillText = match[1];
        const found = skillText
          .split(/[,;|\n•·]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 1 && s.length < 50 && /[a-zA-Z]/.test(s));
        skills.push(...found);
      }
    }

    const commonSkills = [
      'JavaScript',
      'TypeScript',
      'Python',
      'Java',
      'C++',
      'C#',
      'Go',
      'Rust',
      'React',
      'Vue',
      'Angular',
      'Node.js',
      'Express',
      'Next.js',
      'Django',
      'Flask',
      'Spring',
      'AWS',
      'Azure',
      'GCP',
      'Docker',
      'Kubernetes',
      'Terraform',
      'CI/CD',
      'SQL',
      'PostgreSQL',
      'MySQL',
      'MongoDB',
      'Redis',
      'GraphQL',
      'REST',
      'Git',
      'Agile',
      'Scrum',
      'Jira',
      'Confluence',
      'Machine Learning',
      'AI',
      'Data Science',
      'TensorFlow',
      'PyTorch',
      'Strategic Planning',
      'P&L Management',
      'Executive Leadership',
      'Product Management',
      'Financial Modeling',
    ];

    for (const skill of commonSkills) {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(text) && !skills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
        skills.push(skill);
      }
    }

    return [...new Set(skills)].slice(0, 30);
  }

  private extractWorkExperience(text: string): ExtractedWorkExperienceItem[] {
    const experience: ExtractedWorkExperienceItem[] = [];
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let inExperienceSection = false;
    for (const line of lines) {
      if (/^(experience|employment|work history|professional experience)/i.test(line)) {
        inExperienceSection = true;
        continue;
      }
      if (inExperienceSection && /^(education|skills|projects|certifications)/i.test(line)) {
        break;
      }
      if (inExperienceSection && line.length > 5) {
        const parts = line.split(/[,|—–-]/).map((p) => p.trim());
        if (parts.length >= 2 && parts[0]) {
          experience.push({
            company: parts[0],
            jobTitle: parts[1],
            isCurrent: /present|current/i.test(line),
          });
        }
      }
    }
    return experience.slice(0, 10);
  }

  private extractEducation(text: string): ExtractedEducationItem[] {
    const education: ExtractedEducationItem[] = [];
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let inEducationSection = false;
    for (const line of lines) {
      if (/^education/i.test(line)) {
        inEducationSection = true;
        continue;
      }
      if (inEducationSection && /^(experience|skills|projects|certifications)/i.test(line)) {
        break;
      }
      if (inEducationSection && line.length > 5) {
        const degreePatterns = [
          /(B\.?Tech|M\.?Tech|B\.?E\.?|M\.?E\.?|B\.?Sc|M\.?Sc|B\.?A|M\.?A|MBA|PhD|B\.?Com|M\.?Com)/i,
          /(Bachelor|Master|Doctorate|Diploma)/i,
        ];
        for (const pattern of degreePatterns) {
          if (pattern.test(line)) {
            education.push({ qualification: line });
            break;
          }
        }
      }
    }
    return education.slice(0, 5);
  }

  private extractCertifications(text: string): ExtractedCertificationItem[] {
    const certs: ExtractedCertificationItem[] = [];
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let inCertSection = false;
    for (const line of lines) {
      if (/^certifications?/i.test(line)) {
        inCertSection = true;
        continue;
      }
      if (inCertSection && /^(education|skills|projects|experience)/i.test(line)) {
        break;
      }
      if (inCertSection && line.length > 3) {
        certs.push({ name: line });
      }
    }
    return certs.slice(0, 10);
  }

  private extractIndustries(text: string): string[] {
    const industries = [
      'Information Technology',
      'Software Development',
      'Finance',
      'Banking',
      'Healthcare',
      'E-commerce',
      'Retail',
      'Manufacturing',
      'Education',
      'Telecommunications',
      'Automotive',
      'Aerospace',
      'Energy',
      'Consulting',
      'Media',
      'Entertainment',
      'Real Estate',
      'Logistics',
      'Transportation',
    ];
    return industries.filter((i) => new RegExp(`\\b${i}\\b`, 'i').test(text));
  }

  private extractFunctionalAreas(text: string): string[] {
    const areas = [
      'Engineering',
      'Product Management',
      'Design',
      'Marketing',
      'Sales',
      'Operations',
      'Human Resources',
      'Finance',
      'Legal',
      'Data Science',
      'DevOps',
      'Quality Assurance',
      'Security',
      'Architecture',
      'Research',
    ];
    return areas.filter((a) => new RegExp(`\\b${a}\\b`, 'i').test(text));
  }
}
