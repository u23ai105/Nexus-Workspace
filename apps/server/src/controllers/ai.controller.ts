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

    const { prompt, workspaceId, documentId, documentContext, selectedText } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    if (!prompt || !workspaceId) {
      return res.status(400).json({ error: 'Prompt and workspaceId are required.' });
    }

    // Verify workspace access and get general context
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: { where: { userId } },
        documents: {
          select: { title: true, textContent: true }
        },
        tasks: {
          select: { content: true, status: true, priority: true }
        }
      }
    });

    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    if (workspace.members.length === 0) return res.status(403).json({ error: 'Unauthorized workspace access' });

    // Validate Document if provided
    let activeDocumentTitle = '';
    if (documentId) {
      const doc = await prisma.document.findFirst({
        where: { id: documentId, workspaceId }
      });
      if (!doc) return res.status(404).json({ error: 'Document not found or access denied' });
      activeDocumentTitle = doc.title;
    }

    if (!genAI || !model) {
      genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    }

    // Build structured prompt
    const systemInstruction = `You are Nexus Copilot, an AI assistant for a collaborative workspace called "Nexus".
You are helping the user with their workspace context. Follow their instructions clearly and professionally.
Return formatting in standard Markdown. When providing code blocks, explicitly state the language for syntax highlighting.`;

    let workspaceContextStr = '';
    workspace.documents.forEach((doc, idx) => {
      workspaceContextStr += `- Document "${doc.title}":\n  ${doc.textContent ? doc.textContent.substring(0, 10000).replace(/\n/g, ' ') : 'Empty'}...\n`;
    });
    workspaceContextStr += '\nWorkspace Tasks:\n';
    workspace.tasks.forEach((task) => {
      workspaceContextStr += `- [${task.status}] ${task.priority}: ${task.content}\n`;
    });

    let currentDocumentSection = '';
    if (documentId && activeDocumentTitle) {
      currentDocumentSection = `\n[CURRENT DOCUMENT]\nTitle: ${activeDocumentTitle}\n`;
    }

    let selectedTextSection = '';
    if (selectedText) {
      // Bounded selected text
      selectedTextSection = `\n[SELECTED TEXT (Highest Priority Context)]\n"""\n${selectedText.substring(0, 5000)}\n"""\n`;
    }

    let documentContextSection = '';
    if (documentContext && !selectedText) {
      // Bounded document text if no selection
      documentContextSection = `\n[DOCUMENT CONTEXT (Unsaved Live Editor Content)]\n"""\n${documentContext.substring(0, 50000)}\n"""\n`;
    }

    const fullPrompt = `[SYSTEM INSTRUCTIONS]
${systemInstruction}

[WORKSPACE CONTEXT]
${workspaceContextStr.substring(0, 50000)}
${currentDocumentSection}${selectedTextSection}${documentContextSection}
[USER REQUEST]
${prompt}`;

    const result = await model.generateContent(fullPrompt);
    const responseText = result.response.text();

    res.status(200).json({ result: responseText });
  } catch (error) {
    console.error('Workspace AI Chat Error:', error);
    res.status(500).json({ error: 'Failed to generate AI response.' });
  }
};
