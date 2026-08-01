import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@nexus/database';
import { AuthRequest } from '../middlewares/auth.middleware';

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

export const workspaceChat = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { prompt, workspaceId } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    if (!prompt || !workspaceId) {
      return res.status(400).json({ error: 'Prompt and workspaceId are required.' });
    }

    // Verify workspace access
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        documents: {
          select: { title: true, textContent: true }
        },
        tasks: {
          select: { content: true, status: true, priority: true }
        }
      }
    });

    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

    if (!genAI || !model) {
      genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    }

    // Prepare context
    let contextStr = 'Workspace Context:\\n';
    workspace.documents.forEach((doc, idx) => {
      contextStr += `Document ${idx+1} [${doc.title}]:\\n${doc.textContent ? doc.textContent.substring(0, 500) : ''}...\\n\\n`;
    });
    contextStr += '\\nWorkspace Tasks:\\n';
    workspace.tasks.forEach((task, idx) => {
      contextStr += `- [${task.status}] ${task.priority} priority: ${task.content}\\n`;
    });

    const fullPrompt = `You are a helpful AI assistant for a collaborative workspace called "Nexus".
You have access to the following workspace context (summaries of documents and tasks).
Answer the user's question or help them with their request using this context.
If the answer is not in the context, use your general knowledge but mention you are doing so.

${contextStr}

User Prompt: ${prompt}`;

    const result = await model.generateContent(fullPrompt);
    const responseText = result.response.text();

    res.status(200).json({ result: responseText });
  } catch (error) {
    console.error('Workspace AI Chat Error:', error);
    res.status(500).json({ error: 'Failed to generate AI response.' });
  }
};
