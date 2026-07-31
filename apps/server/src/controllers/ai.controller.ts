import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI;
let model: any;

export const aiPrompt = async (req: Request, res: Response) => {
  try {
    const { action, text, context } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    if (!action || !text) {
      return res.status(400).json({ error: 'Action and text are required.' });
    }

    if (!genAI || !model) {
      genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    }

    let prompt = '';

    switch (action) {
      case 'summarize':
        prompt = `Please provide a concise summary of the following text:\n\n${text}`;
        break;
      case 'extract-tasks':
        prompt = `Extract all actionable tasks, action items, or to-dos from the following text. Format the output as a Markdown checklist (- [ ] task).\n\n${text}`;
        break;
      case 'rewrite':
        prompt = `Rewrite the following text to improve grammar, clarity, and professional tone:\n\n${text}`;
        break;
      case 'explain':
        prompt = `Explain the following text simply and clearly:\n\n${text}`;
        break;
      case 'ask':
        prompt = `Context: ${context || 'A document in a collaborative workspace.'}\n\nBased on the context and the following text, please answer this question or follow this instruction: ${text}`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid action specified.' });
    }

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    res.status(200).json({ result: responseText });
  } catch (error) {
    console.error('AI Copilot Error:', error);
    res.status(500).json({ error: 'Failed to generate AI response.' });
  }
};
