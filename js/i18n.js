/* =========================================================
   LOCAL LANGUAGE SYSTEM
   Chinese <-> professional English. No external translation API.
   Language switcher: only 中文 / EN, beside MY DESIGN.
========================================================= */
(() => {
    const STORAGE_KEY = "xiohu-language";

    const translations = {
        "首页": "Home",
        "关于我": "About Me",
        "我的能力": "Skills",
        "我的作品": "Works",
        "联系我": "Contact",
        "摄影": "Photography",
        "一名热爱视觉设计、网页设计与创意创作的设计师。": "A visual designer focused on graphic design, digital experiences and creative work.",
        "我喜欢通过设计将想法转化为视觉作品。": "I turn ideas into thoughtful visual experiences through design.",
        "查看我的作品": "Explore My Work",
        "你好，我是 Xiaohu。": "Hi, I'm Xiaohu.",
        "我是一名专注于视觉设计与数字创作的设计师。": "I'm a designer focused on visual design and digital creation.",
        "我喜欢研究不同的设计风格，并尝试将艺术、设计与技术结合在一起。": "I enjoy exploring different visual styles and bringing art, design and technology together.",
        "我的设计方向包括平面设计、网页设计、UI设计、插画以及品牌视觉设计等。": "My practice spans graphic design, web design, UI, illustration and visual identity.",
        "海报、宣传设计、排版、视觉设计。": "Posters, promotional graphics, typography and visual communication.",
        "网页视觉设计、UI设计、网页排版。": "Web interfaces, visual systems and responsive layouts.",
        "数字插画、角色设计、概念设计。": "Digital illustration, character design and visual concepts.",
        "动画、视频编辑、动态视觉设计。": "Animation, video editing and motion graphics.",
        "设计工具": "Design Tools",
        "品牌视觉设计": "Visual Identity",
        "品牌 Logo、包装以及视觉系统设计。": "Logos, packaging and cohesive visual identity systems.",
        "摄影拍摄": "Photography",
        "野外，生活与产品拍摄": "Outdoor, lifestyle and product photography.",
        "角色设计": "Character Design",
        "原创角色与数字插画作品。": "Original characters and digital illustration.",
        "动态设计": "Motion Design",
        "视频、动画以及动态视觉作品。": "Video, animation and motion-based visual work.",
        "春节": "Chinese New Year",
        "Produk": "Product",
        "GET IN TOUCH": "GET IN TOUCH",
        "Let's connect": "Let's connect",
        "with me.": "with me.",
        "抖音": "Douyin",
        "小红书": "Xiaohongshu",
        "关闭": "Close",
        "ALL MY WORKS": "SELECTED WORKS",
        "全部": "All",
        "品牌设计": "Brand Design",
        "插画": "Illustration",
        "动画": "Motion",
        "原创角色设计": "Original Character Design",
        "生活、环境与人物摄影作品。": "Lifestyle, environmental and portrait photography.",
        "产品摄影": "Product Photography",
        "产品与商业视觉摄影。": "Product and commercial photography.",
        "动态视觉设计": "Motion Visual Design",
        "动画、视频编辑与动态视觉作品。": "Animation, video editing and motion graphics.",
        "极简人物设计": "Minimal Character Design",
        "极简的卡通人物设计": "Minimalist cartoon character design.",
        "您的浏览器不支持视频播放。": "Your browser does not support video playback.",
        "BACK TO HOME": "BACK TO HOME",
        "VIEW WORK ↗": "VIEW PROJECT ↗",
        "VIEW PHOTO ↗": "VIEW PHOTO ↗",
        "VIEW VIDEO ↗": "VIEW VIDEO ↗",
        "GRAPHIC DESIGN": "GRAPHIC DESIGN",
        "作品管理": "Manage Works",
        "摄影作品 01": "Photography 01",
        "摄影作品 02": "Photography 02",
        "春节摄影": "Chinese New Year Photography"
    };

    const reverse = {};
    Object.entries(translations).forEach(([zh, en]) => { reverse[en] = zh; });

    function getLanguage() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === "zh" || saved === "en") return saved;
        const browser = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
        return browser.toLowerCase().startsWith("zh") ? "zh" : "en";
    }

    function translateTextNode(node, language) {
        const value = node.nodeValue;
        const normalized = value.replace(/\s+/g, " ").trim();
        if (!normalized) return;
        const target = language === "en" ? translations[normalized] : reverse[normalized];
        if (!target) return;
        const leading = value.match(/^\s*/)?.[0] || "";
        const trailing = value.match(/\s*$/)?.[0] || "";
        node.nodeValue = leading + target + trailing;
    }

    function translateAttributes(language) {
        ["alt", "title", "aria-label"].forEach(attr => {
            document.querySelectorAll(`[${attr}]`).forEach(element => {
                const value = element.getAttribute(attr);
                const target = language === "en" ? translations[value] : reverse[value];
                if (target) element.setAttribute(attr, target);
            });
        });
    }

    function translatePage(language) {
        document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(node => translateTextNode(node, language));
        translateAttributes(language);

        if (document.title === "My Works - XioHu" || document.title === "Selected Works - XioHu" || document.title === "我的作品 - XioHu") {
            document.title = language === "en" ? "Selected Works - XioHu" : "我的作品 - XioHu";
        }

        document.querySelectorAll("[data-language-switch]").forEach(button => {
            button.textContent = language === "en" ? "中文" : "EN";
            button.setAttribute("aria-label", language === "en" ? "Switch to Chinese" : "切换到英文");
            button.title = language === "en" ? "切换到中文" : "Switch to English";
        });
    }

    window.translateXiohuPage = () => translatePage(getLanguage());

    function addSwitcher() {
        if (document.querySelector("[data-language-switch]")) return;

        const logo = document.querySelector(".navbar .logo");
        if (!logo) return;

        const button = document.createElement("button");
        button.type = "button";
        button.dataset.languageSwitch = "true";
        button.className = "language-switch";
        button.addEventListener("click", () => {
            localStorage.setItem(STORAGE_KEY, getLanguage() === "en" ? "zh" : "en");
            location.reload();
        });

        logo.insertAdjacentElement("afterend", button);
    }

    function addSwitcherStyle() {
        if (document.getElementById("language-switch-style")) return;

        const style = document.createElement("style");
        style.id = "language-switch-style";
        style.textContent = `
            .language-switch {
                appearance: none;
                border: 0;
                background: transparent;
                color: #1d1d1d;
                padding: 5px 0;
                margin-left: 20px;
                min-width: 30px;
                font: inherit;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 1.5px;
                line-height: 1;
                cursor: pointer;
                position: relative;
                transition: opacity .25s ease, transform .25s ease;
                z-index: 1001;
            }
            .language-switch::after {
                content: "";
                position: absolute;
                left: 0;
                right: 0;
                bottom: 0;
                height: 1px;
                background: currentColor;
                transform: scaleX(0);
                transform-origin: right;
                transition: transform .25s ease;
            }
            .language-switch:hover {
                opacity: .55;
                transform: translateY(-1px);
            }
            .language-switch:hover::after {
                transform: scaleX(1);
                transform-origin: left;
            }
            @media (max-width: 768px) {
                .language-switch {
                    margin-left: 14px;
                    font-size: 11px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    document.addEventListener("DOMContentLoaded", () => {
        addSwitcherStyle();
        addSwitcher();
        translatePage(getLanguage());
    });
})();