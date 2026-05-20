
export interface AnalysisResult {
  offerType: string;
  sourceVerification: string;
  companyVerification: string;
  internshipDetailsReview: string;
  redFlagsDetected: string[];
  credibilityScore: number;
  finalVerdict: 'Legit' | 'Suspicious' | 'Fake';
  safetyAdvice: string[];
  groundingSources?: Array<{
    title: string;
    uri: string;
  }>;
}

export type InputMode = 'text' | 'image' | 'url';
