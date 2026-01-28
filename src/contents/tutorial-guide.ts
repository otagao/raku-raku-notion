import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
    matches: [
        "https://www.notion.so/install-integration*",
        "https://notion.so/install-integration*",
        "https://www.notion.so/login*",
        "https://notion.so/login*"
    ]
}

// Detect dark mode preference
const isDarkMode = () => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// Vanilla JS implementation for Star Rail Style Modal Overlay with Slideshow
const injectOverlay = () => {
    // Check if duplicate
    if (document.getElementById("raku-raku-notion-overlay")) return;

    // Check if this is Raku Raku Notion's OAuth flow
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('client_id');
    const expectedClientId = process.env.PLASMO_PUBLIC_NOTION_CLIENT_ID || '';
    const detectLoginPage = () => {
        const pathName = window.location.pathname.toLowerCase();
        if (pathName.includes('/login') || pathName.includes('/signin')) return true;
        if (document.querySelector('input[type="password"], input[name="password"]')) return true;
        if (document.querySelector('input[type="email"], input[name="email"]')) return true;
        if (document.querySelector('form[action*="login"], form[action*="signin"]')) return true;
        if (document.querySelector('[data-testid*="login"], [data-testid*="signin"]')) return true;
        return false;
    };

    // ログインページの場合はclient_idチェックをスキップ（OAuthフローからリダイレクトされた可能性があるため）
    // install-integrationページの場合のみclient_idを検証
    if (!detectLoginPage() && (!expectedClientId || clientId !== expectedClientId)) {
        console.log("Raku Raku Notion: Skipping overlay (different or missing client_id)");
        return;
    }

    console.log("Raku Raku Notion: Injecting Slideshow Overlay");

    const darkMode = isDarkMode();

    const container = document.createElement("div");
    container.id = "raku-raku-notion-overlay";

    // Non-blocking container (allows clicking through to the page)
    container.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 2147483647 !important;
        background-color: transparent !important;
        font-family: 'Segoe UI', sans-serif !important;
        display: flex !important;
        justify-content: flex-end !important;
        align-items: flex-start !important;
        pointer-events: none !important;
        padding: 20px !important;
        box-sizing: border-box !important;
    `;

    // Modal Window (Miniaturized for side display)
    const modal = document.createElement("div");
    modal.style.cssText = `
        position: relative !important;
        width: 400px !important;
        max-width: 90% !important;
        max-height: 80vh !important;
        background: ${darkMode
            ? 'radial-gradient(circle at center, #1a1a2e 0%, #000000 100%)'
            : 'radial-gradient(circle at center, #ffffff 0%, #f5f5f5 100%)'} !important;
        border: 1px solid ${darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)'} !important;
        box-shadow: 0 0 30px ${darkMode ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.2)'} !important;
        color: ${darkMode ? 'white' : '#333333'} !important;
        padding: 0 !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        pointer-events: auto !important;
        border-radius: 10px !important;
        margin-right: 20px !important;
        margin-top: 20px !important;
    `;

    // 1. Header (Icon and Dynamic Title)
    const header = document.createElement("div");
    header.style.cssText = `
        padding: 15px 0 10px 0 !important;
        text-align: center !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 2px !important;
    `;

    // Beginner Shield Icon
    const icon = document.createElement("div");
    icon.textContent = "🔰";
    icon.style.cssText = `
        font-size: 20px !important;
        margin-bottom: 2px !important;
        filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.5)) !important;
    `;
    header.appendChild(icon);

    // Title Element
    const title = document.createElement("h2");
    title.textContent = "認証方法";
    title.style.cssText = `
        font-size: 18px !important;
        margin: 2px 0 0 0 !important;
        color: ${darkMode ? '#fff' : '#333'} !important;
        font-weight: 500 !important;
        letter-spacing: 1px !important;
    `;
    header.appendChild(title);

    // Decorative lines under icon/title
    const decLine = document.createElement("div");
    decLine.style.cssText = `
        width: 100px !important;
        height: 1px !important;
        background: linear-gradient(90deg, transparent, ${darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}, transparent) !important;
        margin-top: 5px !important;
    `;
    header.appendChild(decLine);

    modal.appendChild(header);

    // 2. Content Area (Slides)
    const contentArea = document.createElement("div");
    contentArea.style.cssText = `
        flex: 1 !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: flex-start !important;
        align-items: center !important;
        padding: 10px 20px !important;
        text-align: center !important;
        position: relative !important;
        overflow-y: auto !important;
    `;



    // Slide 2 Content (Text Instructions)
    const slide2 = document.createElement("div");
    slide2.style.cssText = `
        display: none !important;
        flex-direction: column !important;
        align-items: flex-start !important;
        width: 100% !important;
        text-align: left !important;
        color: ${darkMode ? '#eee' : '#333'} !important;
        transition: opacity 0.3s ease !important;
    `;

    // Colors based on dark/light mode
    const headingColor = darkMode ? '#00ffff' : '#0066cc';
    const textColor = darkMode ? '#ccc' : '#555';
    const highlightColor = darkMode ? '#ffff00' : '#cc6600';
    const borderColor = darkMode ? '#00ffff' : '#0066cc';
    const introTextColor = darkMode ? '#fff' : '#333';

    // ログイン画面判定に応じてステップ1を表示

    const buildInstructionsHTML = (loginMode: boolean) => {
        const step1HTML = loginMode ? `
        <div style="margin-bottom: 20px;">
            <h3 style="color: ${headingColor}; font-size: 14px; margin: 0 0 5px 0; font-weight: bold;">1. 「Notionにログイン」またはアカウントを選択</h3>
            <p style="font-size: 13px; line-height: 1.5; color: ${textColor}; margin: 0;">
                <span style="color: ${highlightColor}; font-weight: bold;">※ログインしていない人のみ</span><br>
                Notionにログインしていない人はNotionにログインする画面から始まります。
            </p>
        </div>
    ` : '';

        const step2Num = loginMode ? '2' : '1';
        const step3Num = loginMode ? '3' : '2';

        return `
        <div style="margin-bottom: 5px; font-size: 13px; color: ${introTextColor}; font-weight: bold; border-left: 3px solid ${borderColor}; padding-left: 8px;">
            認証画面での操作手順はこちらの通りです。
        </div>
        ${step1HTML}
        <div style="margin-bottom: 20px;">
            <h3 style="color: ${headingColor}; font-size: 14px; margin: 0 0 5px 0; font-weight: bold;">${step2Num}. 「ページを選択する」ボタンを押す</h3>
            <p style="font-size: 13px; line-height: 1.5; color: ${textColor}; margin: 0;">
                注意事項を読んでから「ページを選択する」ボタンをクリックしてください。
            </p>
        </div>
        <div>
            <h3 style="color: ${headingColor}; font-size: 14px; margin: 0 0 5px 0; font-weight: bold;">${step3Num}. 「アクセスを許可する」</h3>
            <p style="font-size: 13px; line-height: 1.5; color: ${textColor}; margin: 0;">
                何も選択せず「アクセスを許可する」ボタンを押せばOK。
            </p>
        </div>
    `;
    };

    let hasLoginStep = detectLoginPage();
    slide2.innerHTML = buildInstructionsHTML(hasLoginStep);

    if (!hasLoginStep) {
        const loginCheckInterval = window.setInterval(() => {
            if (detectLoginPage()) {
                hasLoginStep = true;
                slide2.innerHTML = buildInstructionsHTML(true);
                window.clearInterval(loginCheckInterval);
            }
        }, 800);
    }




    contentArea.appendChild(slide2);

    modal.appendChild(contentArea);

    // Top right close button on modal
    const closeIcon = document.createElement("div");
    closeIcon.innerHTML = "×";
    closeIcon.style.cssText = `
    position: absolute !important;
    top: 10px !important;
    right: 15px !important;
    font-size: 24px !important;
    color: ${darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.5)'} !important;
    cursor: pointer !important;
    font-weight: bold !important;
    z-index: 10 !important;
    `;
    closeIcon.onclick = () => {
        container.style.opacity = "0";
        container.style.transition = "opacity 0.3s ease";
        setTimeout(() => {
            container.remove();
            showHelpButton();
        }, 300);
    };
    modal.appendChild(closeIcon);

    // Navigation Logic
    const updateSlides = () => {
        // Reset styles
        slide2.style.display = "flex";
        title.textContent = "認証方法";
    };



    // Initial State
    updateSlides();

    container.appendChild(modal);

    // Inject
    const target = document.body || document.documentElement;
    if (target) {
        target.appendChild(container);
    } else {
        setTimeout(injectOverlay, 100);
    }
};

const showHelpButton = () => {
    if (document.getElementById("raku-raku-notion-help-btn")) return;

    const darkMode = isDarkMode();

    const btn = document.createElement("div");
    btn.id = "raku-raku-notion-help-btn";
    btn.textContent = "？";
    btn.style.cssText = `
    position: fixed !important;
    top: 20px !important;
    right: 20px !important;
    width: 50px !important;
    height: 50px !important;
    background: ${darkMode ? '#000000' : '#ffffff'} !important;
    color: ${darkMode ? '#ffffff' : '#333333'} !important;
    border: 2px solid ${darkMode ? '#00ffff' : '#0066cc'} !important;
    border-radius: 50% !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    font-size: 24px !important;
    font-weight: bold !important;
    cursor: pointer !important;
    z-index: 2147483646 !important;
    box-shadow: 0 4px 10px ${darkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)'} !important;
    transition: transform 0.2s, box-shadow 0.2s !important;
    font-family: 'Segoe UI', sans-serif !important;
    `;

    btn.onmouseover = () => {
        btn.style.transform = "scale(1.1)";
        btn.style.boxShadow = darkMode ? "0 0 15px rgba(0, 255, 255, 0.5)" : "0 0 15px rgba(0, 102, 204, 0.4)";
    };
    btn.onmouseout = () => {
        btn.style.transform = "scale(1)";
        btn.style.boxShadow = darkMode ? "0 4px 10px rgba(0,0,0,0.5)" : "0 4px 10px rgba(0,0,0,0.2)";
    };

    btn.onclick = () => {
        btn.remove();
        injectOverlay();
    };

    document.body.appendChild(btn);
}

// Translation Logic
const translations: { [key: string]: string } = {
    "View pages you select": "選択したページを表示",
    "Edit pages you select": "選択したページを編集",
    "Create new content within pages you select": "選択したページ内にコンテンツを作成",
    "View workspace users and their emails": "ワークスペースのユーザーとメールアドレスを表示",
    "Select pages": "ページを選択する",
    "Cancel": "キャンセル",
    "Make sure you trust": "以下を信頼できることを確認してください",
    "already has the following permissions": "には以下の権限がすでに付与されています",
    "Access to": "アクセス許可",
    "Allow access": "アクセスを許可する"
};

const translatePage = () => {
    // Helper to replace text in a node
    const replaceText = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            let text = node.textContent;
            if (!text || !text.trim()) return;

            // 1. Regex replacements (for reordering)
            if (/Connect with\s+(.+)/i.test(text)) {
                node.textContent = text.replace(/Connect with\s+(.+)/i, '$1 と接続');
                return;
            }

            // 2. Exact/Partial match keys
            for (const [key, value] of Object.entries(translations)) {
                if (text.includes(key)) {
                    node.textContent = text.replace(key, value);
                    return;
                }
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Check specific elements like buttons
            const el = node as HTMLElement;
            // Recursively search children
            el.childNodes.forEach(child => replaceText(child));
        }
    };

    // Initial translation
    document.body.childNodes.forEach(child => replaceText(child));

    // Observe changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                replaceText(node);
            });
            if (mutation.type === 'characterData') {
                replaceText(mutation.target);
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });

    console.log("Raku Raku Notion: Translation Observer Started");
};

// Initial injection
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        injectOverlay();
        translatePage();
    });
} else {
    injectOverlay();
    translatePage();
}
