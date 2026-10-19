import { Injectable, Logger } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';

export interface ExtractedResumeData {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  totalExperienceMonths?: number;
  currentJobTitle?: string;
  currentCompany?: string;
  skills: string[];
  workExperience: Array<{
    company: string;
    jobTitle?: string;
    startDate?: Date;
    endDate?: Date;
    isCurrent: boolean;
  }>;
  education: Array<{
    qualification: string;
    institution?: string;
    startYear?: number;
    endYear?: number;
  }>;
  certifications: Array<{
    name: string;
    issuer?: string;
    issueYear?: number;
  }>;
  industries: string[];
  functionalAreas: string[];
  rawText: string;
}

@Injectable()
export class ResumeExtractionService {
  private readonly logger = new Logger(ResumeExtractionService.name);

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
    data.totalExperienceMonths = this.extractTotalExperience(cleanedText);
    data.currentJobTitle = this.extractCurrentJobTitle(lines);
    data.currentCompany = this.extractCurrentCompany(lines);
    data.skills = this.extractSkills(cleanedText);
    data.workExperience = this.extractWorkExperience(cleanedText);
    data.education = this.extractEducation(cleanedText);
    data.certifications = this.extractCertifications(cleanedText);
    data.industries = this.extractIndustries(cleanedText);
    data.functionalAreas = this.extractFunctionalAreas(cleanedText);

    return data;
  }

  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\n\s+\n/g, '\n\n')
      .trim();
  }

  private extractEmail(text: string): string | undefined {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const match = text.match(emailRegex);
    return match?.[0]?.toLowerCase();
  }

  private extractPhone(text: string): string | undefined {
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/;
    const match = text.match(phoneRegex);
    return match?.[0];
  }

  private extractName(lines: string[]): string | undefined {
    for (const line of lines.slice(0, 5)) {
      if (
        line.length > 2 &&
        line.length < 50 &&
        !line.includes('@') &&
        !line.includes('http') &&
        !/^\d/.test(line) &&
        /[A-Za-z]/.test(line)
      ) {
        return line;
      }
    }
    return undefined;
  }

  private extractLocation(text: string): string | undefined {
    const locationPatterns = [
      /(?:Location|Address|Based in|City)[:\s]+([A-Za-z\s,]+)/i,
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*[A-Z]{2}\b/,
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*[A-Z][a-z]+\b/,
    ];

    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }
    return undefined;
  }

  private extractTotalExperience(text: string): number | undefined {
    const patterns = [
      /(\d+)\+?\s*years?\s*(?:of)?\s*experience/i,
      /experience[:\s]+(\d+)\+?\s*years?/i,
      /(\d+)\+?\s*yrs?\s*(?:of)?\s*exp/i,
      /total\s*experience[:\s]*(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const years = parseInt(match[1], 10);
        if (years > 0 && years < 50) {
          return years * 12;
        }
      }
    }
    return undefined;
  }

  private extractCurrentJobTitle(lines: string[]): string | undefined {
    const titleKeywords = [
      'software',
      'engineer',
      'developer',
      'manager',
      'director',
      'lead',
      'architect',
      'analyst',
      'consultant',
      'specialist',
    ];
    for (const line of lines.slice(0, 15)) {
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
    ];

    for (const skill of commonSkills) {
      const regex = new RegExp(`\\b${skill.replace(/\./g, '\\.')}\\b`, 'i');
      if (regex.test(text) && !skills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
        skills.push(skill);
      }
    }

    return [...new Set(skills)].slice(0, 50);
  }

  private extractWorkExperience(text: string): ExtractedResumeData['workExperience'] {
    const experience: ExtractedResumeData['workExperience'] = [];
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
        const parts = line.split(/[,|]/).map((p) => p.trim());
        if (parts.length >= 2) {
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

  private extractEducation(text: string): ExtractedResumeData['education'] {
    const education: ExtractedResumeData['education'] = [];
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

  private extractCertifications(text: string): ExtractedResumeData['certifications'] {
    const certs: ExtractedResumeData['certifications'] = [];
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
