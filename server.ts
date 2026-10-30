import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'AICTE FDR Management System API',
      timestamp: new Date().toISOString(),
    });
  });

  // Server-side Gemini API route for FDR Document Extraction Assistance
  app.post('/api/gemini/extract-fdr', async (req, res) => {
    try {
      const { documentText, base64Data, mimeType, fileName } = req.body || {};

      if (!documentText && !base64Data) {
        return res.status(400).json({
          error: 'Please provide either document text or a base64-encoded document image/PDF for extraction.',
        });
      }

      const parts = [];
      if (base64Data && mimeType) {
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
      }

      const promptText = `You are a statutory verification assistant for the All India Council for Technical Education (AICTE) Fixed Deposit Receipt (FDR) Management System.
Extract structured Fixed Deposit Receipt (FDR) details from the provided ${fileName ? `file (${fileName})` : 'document'}.
${documentText ? `\nDocument Content / OCR Text:\n${documentText}` : ''}

Return accurate values matching the schema. Use YYYY-MM-DD format for dates when identifiable. For jointHolderStatus, choose 'JOINT_WITH_AICTE' if AICTE / Regional Officer is mentioned as joint holder or under lien, 'SOLE_INSTITUTION' if only the institution is listed, or 'UNDER_LIEN_VERIFICATION' if unclear.`;

      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fdrNumber: {
                type: Type.STRING,
                description: 'Fixed Deposit Receipt / Account number',
              },
              bankName: {
                type: Type.STRING,
                description: 'Issuing Scheduled Bank name',
              },
              branchName: {
                type: Type.STRING,
                description: 'Issuing Bank Branch name and city',
              },
              ifscCode: {
                type: Type.STRING,
                description: '11-character IFSC code of the bank branch',
              },
              principalAmount: {
                type: Type.NUMBER,
                description: 'Principal deposit amount in INR',
              },
              maturityAmount: {
                type: Type.NUMBER,
                description: 'Maturity value in INR',
              },
              interestRate: {
                type: Type.NUMBER,
                description: 'Annual interest rate percentage (e.g. 7.25)',
              },
              issueDate: {
                type: Type.STRING,
                description: 'Issue / Deposit start date in YYYY-MM-DD format',
              },
              maturityDate: {
                type: Type.STRING,
                description: 'Maturity date in YYYY-MM-DD format',
              },
              institutionName: {
                type: Type.STRING,
                description: 'Name of the technical institution on the receipt',
              },
              aictePermanentId: {
                type: Type.STRING,
                description: 'AICTE Permanent ID (e.g. 1-482910421) if present',
              },
              jointHolderStatus: {
                type: Type.STRING,
                description: 'One of JOINT_WITH_AICTE, SOLE_INSTITUTION, or UNDER_LIEN_VERIFICATION',
              },
              extractionSummary: {
                type: Type.STRING,
                description: 'Brief statutory verification summary of the extracted certificate fields',
              },
            },
            required: [
              'fdrNumber',
              'bankName',
              'branchName',
              'ifscCode',
              'principalAmount',
              'maturityAmount',
              'interestRate',
              'issueDate',
              'maturityDate',
              'institutionName',
              'aictePermanentId',
              'jointHolderStatus',
              'extractionSummary',
            ],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      return res.json({ extracted: parsed });
    } catch (error) {
      console.error('Gemini FDR extraction error:', error);
      const message = error instanceof Error ? error.message : 'Failed to extract document details via Gemini API.';
      return res.status(500).json({ error: message });
    }
  });

  // 2. Server-side Gemini API route for FDR Authenticity Engine (Forensics & Bank Template Scan)
  app.post('/api/gemini/authenticity-scan', async (req, res) => {
    try {
      const { fdr, templateProfile, baselineTrustScore } = req.body || {};
      if (!fdr) {
        return res.status(400).json({ error: 'FDR record payload is required for forensic analysis.' });
      }

      const prompt = `You are the AICTE Statutory Document Forensics & FDR Authenticity Engine.
Evaluate the following Fixed Deposit Receipt (FDR) submission for potential tampering, bank template compliance, cross-field mathematical consistency, and provenance (Institution-Submitted vs Bank-Confirmed):

FDR Record: ${JSON.stringify(fdr)}
Bank Template Profile: ${JSON.stringify(templateProfile || {})}
Baseline Algorithmic Trust Score: ${baselineTrustScore ?? 75}/100

Provide a concise, rigorous statutory forensic evaluation.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              aiTrustScore: {
                type: Type.NUMBER,
                description: 'Calibrated Trust Score from 0 to 100',
              },
              forensicVerdict: {
                type: Type.STRING,
                description: 'Short verdict such as AUTHENTIC_BANK_CONFIRMED, SUSPICIOUS_TEMPLATE_VARIANCE, or CRITICAL_TAMPER_ALERT',
              },
              ocrAndTemplateFindings: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Specific findings regarding OCR kerning, watermark geometry, IFSC prefix, and compound interest validation',
              },
              provenanceAssessment: {
                type: Type.STRING,
                description: 'Clear distinction between what the institution submitted and what the bank confirmed',
              },
              recommendedOfficerDirective: {
                type: Type.STRING,
                description: 'Concrete statutory next step for the AICTE Scrutiny Officer',
              },
            },
            required: [
              'aiTrustScore',
              'forensicVerdict',
              'ocrAndTemplateFindings',
              'provenanceAssessment',
              'recommendedOfficerDirective',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({ forensicScan: parsed });
    } catch (error) {
      console.error('Gemini Authenticity Scan error:', error);
      const message = error instanceof Error ? error.message : 'Failed to run Gemini forensic scan.';
      return res.status(500).json({ error: message });
    }
  });

  // 3. Server-side Gemini API route for Institution Risk Radar (AI/ML Explainable Risk Prediction)
  app.post('/api/gemini/risk-analysis', async (req, res) => {
    try {
      const { institutionPrediction } = req.body || {};
      if (!institutionPrediction) {
        return res.status(400).json({ error: 'Institution risk profile is required.' });
      }

      const prompt = `You are the AICTE Predictive Compliance & Institution Risk Radar AI Engine.
Analyze this institution's historical compliance record, renewal latency, discrepancy severity, and FDR authenticity trust scores:
${JSON.stringify(institutionPrediction)}

Generate an explainable risk brief helping AICTE officers prioritize interventions before statutory deadlines are missed.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveRiskBrief: {
                type: Type.STRING,
                description: '2-3 sentence explainable ML risk synthesis for AICTE officers',
              },
              primaryCausalFactors: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Top 3 explainable reasons driving the predicted deadline-miss probability',
              },
              escalationRecommendation: {
                type: Type.STRING,
                description: 'Recommended escalation ladder action and timeline',
              },
            },
            required: ['executiveRiskBrief', 'primaryCausalFactors', 'escalationRecommendation'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({ riskBrief: parsed });
    } catch (error) {
      console.error('Gemini Risk Analysis error:', error);
      const message = error instanceof Error ? error.message : 'Failed to generate AI risk brief.';
      return res.status(500).json({ error: message });
    }
  });

  // 4. Server-side Gemini API route for Natural-Language Ledger & Repository Query
  app.post('/api/gemini/nlq-search', async (req, res) => {
    try {
      const { query, sampleStats } = req.body || {};
      if (!query) {
        return res.status(400).json({ error: 'Natural language query string is required.' });
      }

      const prompt = `You are the AICTE Statutory Natural-Language Query (NLQ) & Tamper-Proof Ledger Analyst.
An officer searched the AICTE FDR Management System with the natural-language query:
"${query}"

Current Repository Summary Context:
${JSON.stringify(sampleStats || {})}

Interpret the officer's query into structured search filters and provide a clear statutory analytical answer.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              interpretedIntent: {
                type: Type.STRING,
                description: 'Clear description of what records the officer is requesting',
              },
              structuredSqlPreview: {
                type: Type.STRING,
                description: 'Equivalent SQL query representation of the natural language request',
              },
              analyticalSynthesis: {
                type: Type.STRING,
                description: 'Concise statutory insight answering the officer query based on the matched records',
              },
            },
            required: ['interpretedIntent', 'structuredSqlPreview', 'analyticalSynthesis'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({ nlqAnalysis: parsed });
    } catch (error) {
      console.error('Gemini NLQ error:', error);
      const message = error instanceof Error ? error.message : 'Failed to analyze natural language query.';
      return res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AICTE FDR Management System running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
