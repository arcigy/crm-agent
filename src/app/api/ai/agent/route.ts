import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// ==========================================
// 1. TOOL MANIFEST (Lightweight Index)
// ==========================================
// Toto je "Mapa", ktorú agent vidí vždy. Musí byť super-stručná.
// Cieľ: Agent rýchlo pochopí, ktorú kategóriu potrebuje.
const TOOL_MANIFEST = `
## AVAILABLE TOOL CATEGORIES (Select what you need):

[CATEGORY: CRM_DATA]
- create_contact (Add new person to DB)
- create_deal (Start new business opportunity)
- update_contact (Modify existing info)

[CATEGORY: COMM_EMAIL]
- draft_reply (Generate email text)
- send_email (Execute sending)
- mark_read (Archive/Read status)
- fetch_details (Get full body/attachments)

[CATEGORY: NAV_VIEW]
- search_filter (Find specific items)
- switch_tab (SMS/Calls/Leads)
- toggle_view (HTML/Text mode)

[CATEGORY: CALENDAR]
- check_availability (Free slots)
- schedule_event (Create meeting)

INSTRUCTION: Based on user prompt, SELECT the most relevant tools.
`;

// ==========================================
// 2. TOOL DETAILS (Lazy Loaded Knowledge)
// ==========================================
// Tieto detaily sa "vstreknú" do promptu len ak agent identifikuje potrebu.
// (V tejto zjednodušenej verzii pre efektivitu ich zatiaľ dávame spolu, ale 
// štruktúra je pripravená na dynamické načítavanie v budúcnosti).

const TOOL_DETAILS = `
## DETAILED DIRECTIVES FOR ALL TOOLS:

### #CRM_DATA
- **create_contact**: { name: string, email: string, company?: string, phone?: string }
  - Rule: Extract name from email sender if not explicit.
- **create_deal**: { name: string, value: number, stage: "new" | "negotiation" }
  - Rule: Value 0 if unknown. Name format: "Company - Service".

### #COMM_EMAIL
- **draft_reply**: { subject: string, body_html: string, intent: string }
  - Rule: Use <br> tags. Tone: Professional & Empathetic.
- **send_email**: { id: string, content: string }
  - Rule: ONLY if user explicitly says "send it now".

### #NAV_VIEW
- **search_filter**: { query: string, tab: "all"|"sms"|"calls" }
  - Rule: Convert natural dates to search terms.

### #CALENDAR
- **check_availability**: { time_range: string }
  - Rule: Returns boolean status.
- **schedule_event**: { title: string, start_time: string, duration_min: number }
  - Rule: Always confirm timezone (default Europe/Bratislava).
`;

// ==========================================
// 3. ORCHESTRATION (The Logic)
// ==========================================
const DOE_ORCHESTRATION = `
SYSTEM ROLE: DOE Orchestrator.
GOAL: Map user intent to specific tools.

PROCESS:
1. Read User Command & Email Context.
2. Select relevant tools from Manifest.
3. Apply Detailed Directives.
4. Output specific JSON plan.

OUTPUT JSON FORMAT:
{
  "thought_process": "Why I chose these tools...",
  "workflow": [
    {
      "step_id": 1,
      "tool": "NAME_FROM_MANIFEST",
      "reasoning": "Brief reason...",
      "parameters": { ...specific params defined in Details... }
    }
  ]
}
`;

export async function POST(req: Request) {
    if (!openai) {
        return NextResponse.json({ success: false, error: 'OpenAI API Key missing.' }, { status: 500 });
    }

    try {
        const { prompt, emailBody, sender } = await req.json();

        if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

        // V "Ultra-Optimized" verzii by sme najprv poslali len MANIFEST, 
        // a až v druhom kroku DETAILS. 
        // Pre zachovanie rýchlosti (1 request) posielame teraz komprimovanú verziu oboch.
        // Formátovanie s nadpismi (##) pomáha modelu "preskakovať" nerelevantné časti.

        const SYSTEM_PROMPT = `${TOOL_MANIFEST}\n\n${TOOL_DETAILS}\n\n${DOE_ORCHESTRATION}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                {
                    role: "user",
                    content: `
                    COMMAND: "${prompt}"
                    CONTEXT_SENDER: ${sender}
                    CONTEXT_BODY_SNIPPET:
                    """
                    ${emailBody?.substring(0, 1500)}
                    """
                    `
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
        });

        const result = JSON.parse(completion.choices[0].message.content || '{"workflow": []}');

        return NextResponse.json({
            success: true,
            plan: { actions: result.workflow }
        });

    } catch (error: any) {
        console.error('DOE Agent Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
