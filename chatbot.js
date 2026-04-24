const GROQ_API_KEY = "";
const MODEL_NAME = "llama-3.1-8b-instant";

const systemPromptContent = `
You are the official AI assistant for Arellano University - Juan Sumulong Campus (AU Legarda/Main).
Address users as "Chief" and maintain a polite, professional, and helpful tone.

CAMPUS INFORMATION:
- Address: 2600 Legarda St., Sampaloc, Manila.
- Contact Numbers: 8-734-7371 to 79 and 8-735-3215.

ACADEMIC PROGRAMS (JUAN SUMULONG CAMPUS):
- Basic Education: Pre-School, Elementary (Grades 1–6), Junior High (Grades 7–10), Senior High School.
- Senior High School Tracks: Academic (HUMSS, STEM, GAS, ABM), TVL (Home Economics, ICT), Sports Track, Arts and Design Track.
- Undergraduate Colleges: Arts and Sciences, Criminal Justice, Accountancy, Computer Science, Business and Administration, Education, Allied Medical (Nursing, PT, Pharmacy, etc.), Hospitality & Tourism Management.
- Graduate Studies: Education, Nursing, Business Administration (MBA).
- Special Programs: ETEEAP, TESDA Recognized Short Courses, Transnational Education (USA/Australia partnerships).

OFFICIAL LINKS (use these exact labels when mentioning links):
- Official Website: https://www.arellano.edu.ph/
- Main Facebook Page: https://www.facebook.com/ArellanoUniversityOfficial
- Guidance Office Facebook: https://www.facebook.com/aumainguidanceoffice
- Sports Page Facebook: https://www.facebook.com/ArellanoSports/
- Administration Page: https://arellano.edu.ph/administration/officers-administration/
- Campus Map: https://www.facebook.com/photo.php?fbid=777823891044855&set=a.613144547512791&id=100064517537485

MAP DISCLOSURE:
When a user asks for a map, provide the Campus Map link and note:
1. A more detailed official map was not found; this is from a Foundation Week event.
2. "Restricted Areas" on that map were only for that event — they are generally accessible during regular school hours.

FORMAT RULES:
- Use **bold** for section headers and important terms.
- Use bullet points (lines starting with -) for lists.
- Provide clickable links using this exact format: [Label Text](URL) — always use a friendly label, never a raw URL.
- Keep answers organized, concise, and friendly.

Rules: Only use the provided information. If unknown, direct "Chief" to visit the campus registrar or check the Administration Page.
`;

let conversationHistory = [];
let isSending = false;

function renderMarkdown(text) {
    // Escape HTML
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, (_, label, url) => {
        const encoded = encodeURIComponent(url);
        return `<a class="chat-link" href="#" onclick="openModal('${encoded}'); return false;">${label} ↗</a>`;
    });

    html = html.replace(/(^|[\s>])(https?:\/\/[^\s<&]+)/g, (_, pre, url) => {
        const encoded = encodeURIComponent(url);
        return `${pre}<a class="chat-link" href="#" onclick="openModal('${encoded}'); return false;">Open Link ↗</a>`;
    });

    html = html.replace(/^- (.+)/gm, "<li>$1</li>");
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, (match) => `<ul>${match}</ul>`);
    // Collapse nested <ul> wrappers
    html = html.replace(/<\/ul>\s*<ul>/g, "");

    html = html.replace(/\n/g, "<br>");

    return html;
}

function openModal(encodedUrl) {
    const url = decodeURIComponent(encodedUrl);
    document.getElementById("modal-url-display").textContent = url;
    document.getElementById("modal-confirm-link").href = url;
    document.getElementById("link-modal").classList.add("active");
}

function closeModal() {
    document.getElementById("link-modal").classList.remove("active");
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("link-modal").addEventListener("click", (e) => {
        if (e.target === document.getElementById("link-modal")) closeModal();
    });
});

function handleKeyPress(event) {
    if (event.key === "Enter") sendMessage();
}

function useSuggestion(text) {
    document.getElementById("user-input").value = text;
    sendMessage();
}

async function sendMessage() {
    if (isSending) return;

    const userInputField = document.getElementById("user-input");
    const userText = userInputField.value.trim();
    if (!userText) return;

    userInputField.value = "";
    isSending = true;
    setSendState(false);

    const chatWindow = document.getElementById("chat-window");
    const centerContent = document.getElementById("center-content");
    const suggestionsArea = document.getElementById("suggestions-area");

    // First message: activate chat layout, hide suggestions
    if (!chatWindow.classList.contains("active")) {
        chatWindow.classList.add("active");
        centerContent.style.justifyContent = "flex-start";
        centerContent.style.paddingTop = "20px";
        suggestionsArea.classList.add("hidden");
    }

    conversationHistory.push({ role: "user", content: userText });
    addMessageBubble(userText, "user-message");
    const typingEl = addTypingIndicator();
    scrollToBottom();

    try {
    const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [
                    { role: "system", content: systemPromptContent },
                    ...conversationHistory,
                ],
                temperature: 0.6,
            }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const botReply = data.choices[0].message.content;
        conversationHistory.push({ role: "assistant", content: botReply });

        typingEl.remove();
        addMessageBubble(botReply, "bot-message", true);
    } catch (err) {
        console.error(err);
        typingEl.remove();
        // Remove failed user turn so it can be retried
        conversationHistory.pop();
        addMessageBubble(
            "Sorry Chief, I'm having connection issues. Please try again.",
            "bot-message"
        );
    }

    isSending = false;
    setSendState(true);
    scrollToBottom();
}

function setSendState(enabled) {
    const btn = document.getElementById("send-btn");
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? "1" : "0.5";
    btn.style.cursor = enabled ? "pointer" : "not-allowed";
}

function addMessageBubble(text, type, useMarkdown = false) {
    const chatWindow = document.getElementById("chat-window");
    const div = document.createElement("div");
    div.className = `message ${type}`;
    if (useMarkdown) {
        div.innerHTML = renderMarkdown(text);
    } else {
        div.innerText = text;
    }
    chatWindow.appendChild(div);
}

function addTypingIndicator() {
    const chatWindow = document.getElementById("chat-window");
    const div = document.createElement("div");
    div.className = "message bot-message typing-indicator";
    div.innerHTML = "<span></span><span></span><span></span>";
    chatWindow.appendChild(div);
    return div;
}

function scrollToBottom() {
    const chatWindow = document.getElementById("chat-window");
    chatWindow.scrollTop = chatWindow.scrollHeight;
}