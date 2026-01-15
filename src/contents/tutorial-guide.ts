import type { PlasmoCSConfig } from "plasmo"
import guideIconsUrl from "data-base64:../../assets/guide-icons.png"
import guideLoginUrl from "data-base64:../../assets/guide-login.png"

export const config: PlasmoCSConfig = {
    matches: [
        "https://www.notion.so/install-integration*",
        "https://notion.so/install-integration*"
    ]
}

// Vanilla JS implementation for Star Rail Style Modal Overlay with Slideshow
const injectOverlay = () => {
    // Check if duplicate
    if (document.getElementById("raku-raku-notion-overlay")) return;

    console.log("Raku Raku Notion: Injecting Slideshow Overlay");

    let currentSlide = 0;
    const totalSlides = 3;

    const container = document.createElement("div");
    container.id = "raku-raku-notion-overlay";

    // Full screen blocking container
    container.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 2147483647 !important;
        background-color: rgba(0, 0, 0, 0.85) !important;
        font-family: 'Segoe UI', sans-serif !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        pointer-events: auto !important;
        backdrop-filter: blur(8px) !important;
    `;

    // Prevent scrolling
    document.body.style.overflow = "hidden";

    // Modal Window
    const modal = document.createElement("div");
    modal.style.cssText = `
        position: relative !important;
        width: 900px !important;
        max-width: 90% !important;
        min-height: 650px !important; /* Increased height for 3rd page image */
        background: radial-gradient(circle at center, #1a1a2e 0%, #000000 100%) !important;
        border-top: 1px solid rgba(255, 255, 255, 0.2) !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
        box-shadow: 0 0 50px rgba(0, 0, 0, 0.9) !important;
        color: white !important;
        padding: 0 !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
    `;

    // 1. Header (Icon and Dynamic Title)
    const header = document.createElement("div");
    header.style.cssText = `
        padding: 30px 0 10px 0 !important;
        text-align: center !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 5px !important;
    `;

    // Beginner Shield Icon
    const icon = document.createElement("div");
    icon.textContent = "🔰";
    icon.style.cssText = `
        font-size: 30px !important;
        margin-bottom: 5px !important;
        filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.5)) !important;
    `;
    header.appendChild(icon);

    // Title Element
    const title = document.createElement("h2");
    title.textContent = "認証"; // Default for Page 1
    title.style.cssText = `
        font-size: 24px !important;
        margin: 5px 0 0 0 !important;
        color: #fff !important;
        font-weight: 500 !important;
        letter-spacing: 2px !important;
    `;
    header.appendChild(title);

    // Decorative lines under icon/title
    const decLine = document.createElement("div");
    decLine.style.cssText = `
        width: 200px !important;
        height: 1px !important;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent) !important;
        margin-top: 10px !important;
    `;
    header.appendChild(decLine);

    modal.appendChild(header);

    // 2. Content Area (Slides)
    const contentArea = document.createElement("div");
    contentArea.style.cssText = `
        flex: 1 !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        align-items: center !important;
        padding: 20px 60px !important;
        text-align: center !important;
        position: relative !important;
    `;

    // Slide 1 Content (Main Guide)
    const slide1 = document.createElement("div");
    slide1.style.cssText = `
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        width: 100% !important;
        transition: opacity 0.3s ease !important;
    `;

    // Image Container for Slide 1
    const imgContainer = document.createElement("div");
    imgContainer.style.cssText = `
        position: relative !important;
        width: 100% !important;
        max-width: 500px !important;
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        padding: 30px !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        margin-bottom: 20px !important;
    `;

    // Decoration corners
    const corners = ["top-left", "top-right", "bottom-left", "bottom-right"];
    corners.forEach(pos => {
        const corner = document.createElement("div");
        let style = "position: absolute !important; width: 10px !important; height: 10px !important; border-color: rgba(255,255,255,0.5) !important; border-style: solid !important;";
        if (pos === "top-left") style += "top: 0; left: 0; border-width: 1px 0 0 1px !important;";
        if (pos === "top-right") style += "top: 0; right: 0; border-width: 1px 1px 0 0 !important;";
        if (pos === "bottom-left") style += "bottom: 0; left: 0; border-width: 0 0 1px 1px !important;";
        if (pos === "bottom-right") style += "bottom: 0; right: 0; border-width: 0 1px 1px 0 !important;";
        corner.style.cssText = style;
        imgContainer.appendChild(corner);
    });

    const img = document.createElement("img");
    img.src = guideIconsUrl;
    img.style.cssText = `
        max-width: 100% !important;
        height: auto !important;
        display: block !important;
        filter: drop-shadow(0 0 20px rgba(0, 255, 255, 0.2)) !important;
    `;
    imgContainer.appendChild(img);
    slide1.appendChild(imgContainer);

    const textDesc1 = document.createElement("div");
    textDesc1.innerHTML = `
        <div>拡張機能のボタンをもう一度押すと認証をどう進めればいいかのチュートリアルが表示されます</div>
        <div style="font-size: 13px; color: #aaa; margin-top: 8px;">
            この画面を閉じた後も、画面内の<span style="color: #00ffff; font-weight: bold;">？ボタン</span>を押すことで、この説明をいつでも確認できます。
        </div>
    `;
    textDesc1.style.cssText = `
        font-size: 15px !important;
        color: #d0d0d0 !important;
        font-weight: 500 !important;
    `;
    slide1.appendChild(textDesc1);

    // Slide 2 Content (Text Instructions)
    const slide2 = document.createElement("div");
    slide2.style.cssText = `
        display: none !important;
        flex-direction: column !important;
        align-items: flex-start !important;
        width: 100% !important;
        max-width: 600px !important;
        text-align: left !important;
        color: #eee !important;
        transition: opacity 0.3s ease !important;
    `;

    const instructionsHTML = `
        <div style="margin-bottom: 20px; font-size: 16px; color: #fff; font-weight: bold; border-left: 4px solid #00ffff; padding-left: 10px;">
            このような手順の説明の文章が表示されます。
        </div>
        <div style="margin-bottom: 30px;">
            <h3 style="color: #00ffff; font-size: 20px; margin: 0 0 10px 0; font-weight: bold;">1. 「ページを選択する」ボタンを押す</h3>
            <p style="font-size: 15px; line-height: 1.6; color: #ccc; margin: 0;">
                注意事項を読んでから「ページを選択する」ボタンをクリックしてください。
            </p>
        </div>
        <div>
            <h3 style="color: #00ffff; font-size: 20px; margin: 0 0 10px 0; font-weight: bold;">2. 何も選択せず「アクセスを許可する」</h3>
            <p style="font-size: 15px; line-height: 1.6; color: #ccc; margin: 0;">
                公開/非公開ページともに、<span style="color: #fff; text-decoration: underline;">何も選択せずに</span>「アクセスを許可する」ボタンを押せばOKです。
            </p>
        </div>
    `;
    slide2.innerHTML = instructionsHTML;

    // Slide 3 Content (Login Info)
    const slide3 = document.createElement("div");
    slide3.style.cssText = `
        display: none !important;
        flex-direction: column !important;
        align-items: center !important;
        width: 100% !important;
        transition: opacity 0.3s ease !important;
    `;

    // Image Container for Slide 3
    const imgContainer3 = document.createElement("div");
    imgContainer3.style.cssText = `
        position: relative !important;
        width: 100% !important;
        max-width: 500px !important;
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        padding: 20px !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        margin-bottom: 20px !important;
    `;

    const img3 = document.createElement("img");
    img3.src = guideLoginUrl;
    img3.style.cssText = `
        max-width: 100% !important;
        max-height: 300px !important;
        width: auto !important;
        display: block !important;
        border-radius: 4px !important;
    `;
    imgContainer3.appendChild(img3);
    slide3.appendChild(imgContainer3);

    const textDesc3 = document.createElement("div");
    textDesc3.innerHTML = `
        <div style="font-weight: bold; font-size: 18px; margin-bottom: 10px;">Notionにログインしていない場合</div>
        <div>Notionにログインしていない人は、<br>このようなNotionにログインする画面から始まります。</div>
    `;
    textDesc3.style.cssText = `
        font-size: 15px !important;
        color: #d0d0d0 !important;
        font-weight: 500 !important;
    `;
    slide3.appendChild(textDesc3);

    contentArea.appendChild(slide1);
    contentArea.appendChild(slide2);
    contentArea.appendChild(slide3);
    modal.appendChild(contentArea);

    // Pagination Dots
    const dotsContainer = document.createElement("div");
    dotsContainer.style.cssText = `
        display: flex !important;
        justify-content: center !important;
        margin-bottom: 20px !important;
    `;

    const createDot = (active: boolean) => {
        const span = document.createElement("span");
        span.style.cssText = `
            display: inline-block !important;
            width: ${active ? '8px' : '6px'} !important;
            height: ${active ? '8px' : '6px'} !important;
            background: ${active ? '#fff' : '#555'} !important;
            border-radius: 50% !important;
            margin: 0 5px !important;
            transition: all 0.3s !important;
        `;
        return span;
    };

    const updateDots = () => {
        dotsContainer.innerHTML = '';
        for (let i = 0; i < totalSlides; i++) {
            dotsContainer.appendChild(createDot(i === currentSlide));
        }
    };
    updateDots();

    // 3. Footer (Close Button and Dots)
    const footer = document.createElement("div");
    footer.style.cssText = `
        padding: 0 0 40px 0 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 20px !important;
    `;

    footer.appendChild(dotsContainer);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "閉じる";
    closeBtn.style.cssText = `
        background: #ffffff !important;
        color: #000000 !important;
        border: none !important;
        padding: 12px 100px !important;
        font-size: 16px !important;
        font-weight: bold !important;
        border-radius: 50px !important;
        cursor: pointer !important;
        transition: transform 0.2s, box-shadow 0.2s !important;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3) !important;
    `;
    closeBtn.onmouseover = () => {
        closeBtn.style.transform = "scale(1.02)";
        closeBtn.style.boxShadow = "0 0 20px rgba(255, 255, 255, 0.4)";
    };
    closeBtn.onmouseout = () => {
        closeBtn.style.transform = "scale(1)";
        closeBtn.style.boxShadow = "0 5px 15px rgba(0,0,0,0.3)";
    };
    closeBtn.onclick = () => {
        container.style.opacity = "0";
        container.style.transition = "opacity 0.5s ease";
        setTimeout(() => {
            container.remove();
            document.body.style.overflow = "";
            showHelpButton(); // Show the persistent help button
        }, 500);
    };

    footer.appendChild(closeBtn);
    modal.appendChild(footer);

    // Navigation Logic
    const updateSlides = () => {
        // Reset styles
        slide1.style.display = "none";
        slide2.style.display = "none";
        slide3.style.display = "none";

        // Show current
        if (currentSlide === 0) {
            slide1.style.display = "flex";
            title.textContent = "認証"; // Title for Page 1
        } else if (currentSlide === 1) {
            slide2.style.display = "flex";
            title.textContent = "手順"; // Title for Page 2
        } else if (currentSlide === 2) {
            slide3.style.display = "flex";
            title.textContent = "ログイン"; // Title for Page 3
        }

        // Arrow state
        if (currentSlide === 0) {
            arrowLeft.style.opacity = "0.3";
            arrowLeft.style.cursor = "default";
            arrowRight.style.opacity = "1";
            arrowRight.style.cursor = "pointer";
        } else if (currentSlide === totalSlides - 1) {
            arrowRight.style.opacity = "0.3";
            arrowRight.style.cursor = "default";
            arrowLeft.style.opacity = "1";
            arrowLeft.style.cursor = "pointer";
        } else {
            arrowLeft.style.opacity = "1";
            arrowLeft.style.cursor = "pointer";
            arrowRight.style.opacity = "1";
            arrowRight.style.cursor = "pointer";
        }

        updateDots();
    };

    // Side arrows (Buttons)
    const arrowLeft = document.createElement("div");
    arrowLeft.innerHTML = "&#10094;"; // <
    arrowLeft.style.cssText = `
        position: absolute !important;
        left: 30px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        font-size: 40px !important;
        color: rgba(255,255,255,1) !important;
        font-weight: 100 !important;
        cursor: pointer !important;
        padding: 20px !important;
        user-select: none !important;
        transition: transform 0.2s !important;
    `;
    arrowLeft.onclick = () => {
        if (currentSlide > 0) {
            currentSlide--;
            updateSlides();
        }
    };
    modal.appendChild(arrowLeft);

    const arrowRight = document.createElement("div");
    arrowRight.innerHTML = "&#10095;"; // >
    arrowRight.style.cssText = `
        position: absolute !important;
        right: 30px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        font-size: 40px !important;
        color: rgba(255,255,255,1) !important;
        font-weight: 100 !important;
        cursor: pointer !important;
        padding: 20px !important;
        user-select: none !important;
        transition: transform 0.2s !important;
    `;
    arrowRight.onclick = () => {
        if (currentSlide < totalSlides - 1) {
            currentSlide++;
            updateSlides();
        }
    };
    modal.appendChild(arrowRight);

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

    const btn = document.createElement("div");
    btn.id = "raku-raku-notion-help-btn";
    btn.textContent = "？";
    btn.style.cssText = `
        position: fixed !important;
        bottom: 20px !important;
        right: 20px !important;
        width: 50px !important;
        height: 50px !important;
        background: #000000 !important;
        color: #ffffff !important;
        border: 2px solid #00ffff !important;
        border-radius: 50% !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        font-size: 24px !important;
        font-weight: bold !important;
        cursor: pointer !important;
        z-index: 2147483646 !important;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5) !important;
        transition: transform 0.2s, box-shadow 0.2s !important;
        font-family: 'Segoe UI', sans-serif !important;
    `;

    btn.onmouseover = () => {
        btn.style.transform = "scale(1.1)";
        btn.style.boxShadow = "0 0 15px rgba(0, 255, 255, 0.5)";
    };
    btn.onmouseout = () => {
        btn.style.transform = "scale(1)";
        btn.style.boxShadow = "0 4px 10px rgba(0,0,0,0.5)";
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
