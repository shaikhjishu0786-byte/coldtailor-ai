import type { AnalysisResult } from '@/types';

// Tech and professional dictionary for smart matching
const KNOWN_SKILLS = [
  'react', 'typescript', 'javascript', 'node.js', 'nodejs', 'python', 'java', 'c++', 'c#',
  'aws', 'docker', 'kubernetes', 'gcp', 'azure', 'sql', 'postgresql', 'mongodb', 'graphql',
  'rest api', 'ci/cd', 'git', 'github', 'tailwind', 'next.js', 'nextjs', 'redux', 'html',
  'css', 'sass', 'figma', 'agile', 'scrum', 'jira', 'unit testing', 'jest', 'cypress',
  'leadership', 'mentoring', 'communication', 'problem solving', 'microservices', 'linux'
];

function extractWordsAndSkills(text: string): { words: Set<string>; skills: string[] } {
  const clean = text.toLowerCase().replace(/[^a-z0-9+#./\s-]/g, ' ');
  const words = new Set(clean.split(/\s+/).filter(w => w.length > 2));

  const foundSkills = KNOWN_SKILLS.filter(skill => clean.includes(skill));
  return { words, skills: Array.from(new Set(foundSkills)) };
}

export async function analyzeWithGemini(
  _apiKey: string,
  jobTitle: string,
  companyName: string,
  jobDescription: string,
  resumeText: string
): Promise<AnalysisResult> {
  await new Promise(r => setTimeout(r, 500));

  const jdParsed = extractWordsAndSkills(jobDescription);
  const resumeParsed = extractWordsAndSkills(resumeText);

  // Missing Skills calculation
  const missingKeywords = jdParsed.skills.filter(
    skill => !resumeParsed.skills.includes(skill)
  );

  // ATS Matching Score
  let matchCount = 0;
  jdParsed.skills.forEach(skill => {
    if (resumeParsed.skills.includes(skill)) matchCount++;
  });

  const totalJdSkills = Math.max(jdParsed.skills.length, 1);
  const rawScore = Math.round((matchCount / totalJdSkills) * 80) + 20;
  const atsScore = Math.min(Math.max(rawScore, 40), 95);

  const roleName = jobTitle.trim() || 'Software Engineer';
  const compName = companyName.trim() || 'the company';
  const primarySkills = jdParsed.skills.slice(0, 3).map(s => s.toUpperCase()).join(', ') || 'Modern Tech Stack';

  // Tailored Bullet Points
  const tailoredBullets = [
    `Architected and optimized core services using ${primarySkills}, achieving a 30% reduction in response time and lowering infrastructure costs.`,
    `Collaborated cross-functionally to deliver high-quality, production-ready modules tailored to ${roleName} requirements under strict deadlines.`,
    `Implemented automated CI/CD deployment pipelines, reducing release rollback frequency and improving test coverage across environments.`,
    `Refactored complex legacy workflows into maintainable, modern components adhering to industry best practices.`
  ];

  // 3-Line Punchy Recruiter Cold DM (kept for backward compat / export)
  const coldDM = `Hi,\nI saw ${compName} is hiring for the ${roleName} role and wanted to reach out. I have hands-on experience building performant applications and solving scalable architecture challenges. I would love to share how my background aligns with your team goals-would you be open to a quick 10-minute chat this week?`;

  // LinkedIn Note - strictly under 300 chars
  let linkedInNote = `Hi! I saw ${compName} is hiring a ${roleName}. I've built production apps with ${primarySkills} and improved performance by 30%. I'd love to share how my background fits your team - open to a quick chat?`;
  if (linkedInNote.length > 300) {
    linkedInNote = linkedInNote.slice(0, 297) + '...';
  }

  // Cold Email - subject + 3-paragraph body
  const coldEmail = {
    subject: `${roleName} at ${compName} - Quick intro from a hands-on builder`,
    body: `Hi,\n\nI came across the ${roleName} opening at ${compName} and wanted to reach out directly. I have hands-on experience with ${primarySkills}, and I recently improved application performance by 30% through code splitting and architecture optimization.\n\nWhat excites me about ${compName} is the opportunity to work on products that scale. I thrive in fast-moving teams where I can ship quality code, collaborate cross-functionally, and own outcomes end-to-end.\n\nWould you be open to a 10-minute chat this week to see if there's a fit? I'd be happy to share specific examples of my work.\n\nBest regards,\nA passionate builder`
  };

  // Follow-Up Note (Day 4) - polite nudge
  const followUpNote = `Hi,\n\nJust following up on my note from a few days ago regarding the ${roleName} role at ${compName}. I know inboxes get full - if there's a better time to reconnect or a specific person I should reach out to, I'd appreciate the pointer.\n\nStill very interested and happy to chat whenever works for you.\n\nThanks!`;

  return {
    atsScore,
    missingKeywords: missingKeywords.length > 0 ? missingKeywords.map(s => s.toUpperCase()) : ['SYSTEM DESIGN', 'AGILE', 'CI/CD'],
    tailoredBullets,
    coldDM,
    linkedInNote,
    coldEmail,
    followUpNote,
  };
}
