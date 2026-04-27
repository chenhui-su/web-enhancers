// ==UserScript==
// @name         Gemini UI Enhancer | Gemini 界面增强
// @name:zh-CN   Gemini 界面增强
// @name:en      Gemini UI Enhancer
// @version      1.0.16
// @license      MIT
// @description  Gemini 网页端界面优化：侧边目录生成、Markdown/公式渲染修复、深色模式适配、护眼排版样式注入。[字体修复版]
// @match        https://gemini.google.com/*
// @grant        GM_addStyle
// @run-at       document-end
// @homepageURL  https://github.com/chenhui-su/gemini-ui-enhancer
// @downloadURL  https://raw.githubusercontent.com/chenhui-su/web-enhancers/main/packages/gemini-ui-enhancer/src/legacy.js
// @updateURL    https://raw.githubusercontent.com/chenhui-su/web-enhancers/main/packages/gemini-ui-enhancer/userscript.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // ========================================================================
    // === 常量定义 ===
    // ========================================================================
    const CONSTANTS = {
        STORAGE_KEY: 'gemini_reader_config',
        STYLE_ID: 'gemini-enhancer-core',
        TOC_PANEL_ID: 'wx-toc-panel',
        SETTING_PANEL_ID: 'wx-panel',
        OVERLAY_ID: 'wx-overlay',
        FAB_ID: 'wx-fab',
        TOC_FAB_ID: 'wx-toc-fab',
        DEBOUNCE_DELAY: 150,
        OBSERVER_DELAY: 1000,
        SCROLL_OFFSET: 80,
        SCROLL_DURATION: 400,
        DEBUG_MODE: false,
        SELECTORS: {
            MAIN: 'main',
            RESPONSE: '.model-response-text',
            USER_QUERY: '.query-text.gds-body-l',
            QUERY_LINE: '.query-text-line',
            SCROLL_CONTAINER: 'infinite-scroller',
            HEADINGS: 'h1, h2, h3',
            BOLD_ELEMENTS: 'b, strong',
            KATEX: '.katex, .MathJax, mjx-container, .math, .mwe-math-element',
            DARK_THEME_BODY: 'body.dark-theme'
        },
        FONTS: {
            sans: '"Source Han Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
            serif: '"Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", serif',
            wenkai: '"LXGW WenKai Screen", "LXGW WenKai", "KaiTi", "STKaiti", serif',
            jost: '"Jost", "Source Han Sans SC", sans-serif'
        },
        FONT_OPTIONS: [
            { id: 'sans', name: '思源黑体' },
            { id: 'serif', name: '思源宋体' },
            { id: 'wenkai', name: '霞鹜文楷' },
            { id: 'jost', name: 'Jost' }
        ],
        THEMES: {
            white:  { bg: '#ffffff', text: '#333333', accentBg: '#f7f7f7', accentText: '#333', inputBg: 'rgba(255,255,255,0.85)', sidebarText: '#000000' },
            yellow: { bg: '#f6f1e7', text: '#5b4636', accentBg: '#ffffff', accentText: '#4a3b2f', inputBg: 'rgba(255,255,255,0.7)', sidebarText: '#000000' },
            green:  { bg: '#cce8cf', text: '#222222', accentBg: '#ffffff', accentText: '#1f3322', inputBg: 'rgba(255,255,255,0.7)', sidebarText: '#000000' },
            dark:   { bg: '#1a1a1a', text: '#bfbfbf', accentBg: '#2d2d2d', accentText: '#e0e0e0', inputBg: 'rgba(42,42,42,0.8)', sidebarText: '#ffffff' }
        },
        DEFAULT_CONFIG: {
            theme: 'yellow',
            fontType: 'serif',
            fontSize: 19,
            maxWidth: 900,
            hideFooter: true,
            publicStyle: false,
            publicColor: 'yellow',
            publicType: 'half',
            autoWebDark: true,
            userLightTheme: 'yellow'
        }
    };

    // ========================================================================
    // === 工具函数模块 ===
    // ========================================================================
    const Utils = {
        safeParse(json, fallback = {}) {
            try { return JSON.parse(json) || fallback; }
            catch { return fallback; }
        },

        debounce(func, wait) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        },

        createElement(tag, className, text) {
            const el = document.createElement(tag);
            if (className) el.className = className;
            if (text !== undefined) el.textContent = text;
            return el;
        },

        findScrollableParent(element) {
            let parent = element.parentElement;
            while (parent) {
                const style = window.getComputedStyle(parent);
                if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                    return parent;
                }
                parent = parent.parentElement;
            }
            return document.scrollingElement || document.body;
        },

        smoothScroll(element, offset = CONSTANTS.SCROLL_OFFSET, duration = CONSTANTS.SCROLL_DURATION) {
            try {
                const container = Utils.findScrollableParent(element);
                const isWindow = (container === document.body || container === document.documentElement);
                
                const getScrollInfo = () => {
                    if (isWindow) {
                        return {
                            current: window.pageYOffset,
                            target: element.getBoundingClientRect().top + window.pageYOffset - offset
                        };
                    } else {
                        return {
                            current: container.scrollTop,
                            target: container.scrollTop + element.getBoundingClientRect().top - container.getBoundingClientRect().top - offset
                        };
                    }
                };

                const { current, target } = getScrollInfo();
                const distance = target - current;
                let start = null;

                const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

                const step = (timestamp) => {
                    if (!start) start = timestamp;
                    const progress = Math.min((timestamp - start) / duration, 1);
                    const eased = easeOutCubic(progress);
                    
                    if (isWindow) {
                        window.scrollTo(0, current + distance * eased);
                    } else {
                        container.scrollTop = current + distance * eased;
                    }
                    
                    if (progress < 1) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
            } catch (e) {
                console.warn('Smooth scroll fallback:', e);
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        },

        loadStylesheet(url, onError) {
            return new Promise((resolve, reject) => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = url;
                link.onload = () => resolve();
                link.onerror = () => {
                    console.warn(`Stylesheet load failed: ${url}`);
                    if (onError) onError();
                    reject();
                };
                document.head.appendChild(link);
            });
        }
    };

    // ========================================================================
    // === 配置管理模块（发布订阅模式） ===
    // ========================================================================
    const ConfigManager = {
        config: { ...CONSTANTS.DEFAULT_CONFIG },
        subscribers: new Set(),

        init() {
            const stored = Utils.safeParse(localStorage.getItem(CONSTANTS.STORAGE_KEY));
            this.config = { ...CONSTANTS.DEFAULT_CONFIG, ...stored };
            if (!this.config.publicType) this.config.publicType = 'half';
            if (!CONSTANTS.FONTS[this.config.fontType]) {
                console.warn('[Gemini UI Enhancer] Unknown fontType, fallback to default:', this.config.fontType);
                this.config.fontType = CONSTANTS.DEFAULT_CONFIG.fontType;
            }
            return this;
        },

        get(key) { return this.config[key]; },
        getAll() { return { ...this.config }; },

        set(key, value, batch = false) {
            if (this.config[key] === value) return;
            this.config[key] = value;
            if (!batch) this._notify();
        },

        batchUpdate(updates) {
            let changed = false;
            for (const [key, value] of Object.entries(updates)) {
                if (this.config[key] !== value) {
                    this.config[key] = value;
                    changed = true;
                }
            }
            if (changed) this._notify();
        },

        save() {
            try {
                localStorage.setItem(CONSTANTS.STORAGE_KEY, JSON.stringify(this.config));
            } catch (e) {
                console.error('Config save failed:', e);
            }
        },

        subscribe(callback) {
            this.subscribers.add(callback);
            return () => this.subscribers.delete(callback);
        },

        _notify() {
            this.save();
            this.subscribers.forEach(cb => {
                try { cb({ ...this.config }); }
                catch (e) { console.error('Config subscriber error:', e); }
            });
        }
    };

    // ========================================================================
    // === 样式管理模块（高优先级注入 + CSS 变量驱动） ===
    // ========================================================================
    const StyleManager = {
        styleEl: null,
        dynamicStyleEl: null,

        init() {
            // 核心静态样式：使用 GM_addStyle 确保最高优先级（抵抗网页内联样式覆盖）
            if (!document.getElementById(CONSTANTS.STYLE_ID)) {
                const css = this._generateStaticCSS();
                if (typeof GM_addStyle !== 'undefined') {
                    GM_addStyle(css);
                } else {
                    const style = document.createElement('style');
                    style.id = CONSTANTS.STYLE_ID;
                    style.textContent = css;
                    document.head.appendChild(style);
                }
            }

            // 动态样式（用于字号等运行时变更）
            this.dynamicStyleEl = document.createElement('style');
            this.dynamicStyleEl.id = `${CONSTANTS.STYLE_ID}-dynamic`;
            document.head.appendChild(this.dynamicStyleEl);

            return this;
        },

        applyTheme(cfg) {
            const root = document.documentElement;
            const t = CONSTANTS.THEMES[cfg.theme];
            if (!t) return;
            const font = CONSTANTS.FONTS[cfg.fontType] || CONSTANTS.FONTS[CONSTANTS.DEFAULT_CONFIG.fontType];

            if (CONSTANTS.DEBUG_MODE) {
                console.info('[Gemini UI Enhancer] font mapping', {
                    selectedFontType: cfg.fontType,
                    appliedFont: font,
                    fontKeys: Object.keys(CONSTANTS.FONTS),
                    uiValues: CONSTANTS.FONT_OPTIONS.map(item => item.id),
                    defaultFontType: CONSTANTS.DEFAULT_CONFIG.fontType
                });
            }

            // 更新 CSS 变量（零重排）
            root.style.setProperty('--w-bg', t.bg);
            root.style.setProperty('--w-text', t.text);
            root.style.setProperty('--w-accent-bg', t.accentBg);
            root.style.setProperty('--w-accent-text', t.accentText);
            root.style.setProperty('--w-input-bg', t.inputBg);
            root.style.setProperty('--w-sidebar-text', t.sidebarText);
            root.style.setProperty('--w-font', font);
            root.style.setProperty('--w-max-width', `${cfg.maxWidth}px`);
            root.style.setProperty('--w-footer-display', cfg.hideFooter ? 'none' : 'block');

            // 更新 data 属性（用于条件样式）
            document.body.setAttribute('data-theme', cfg.theme === 'dark' ? 'dark' : cfg.theme === 'green' ? 'green' : 'light');
            document.body.setAttribute('data-public-style', cfg.publicStyle);
            document.body.setAttribute('data-pub-color', cfg.publicColor);
            document.body.setAttribute('data-pub-type', cfg.publicType);

            // 动态更新字号（仅此项需要重注入）
            this._updateDynamicCSS(cfg.fontSize);
        },

        _generateStaticCSS() {
            return `
                /* === 核心变量 === */
                :root {
                    --w-toc-width: 280px;
                    --w-input-radius: 28px;
                    --w-pub-high: rgba(255, 235, 59, 0.6);
                    --w-pub-accent: #fbe204;
                    --w-pub-text-on-high: inherit;
                }
                
                /* === 全局字体基座：高权重选择器 + 排除法 === */
                
                /* 正文内容：逐层覆盖模型回复区域 */
                .model-response-text p,
                .model-response-text li,
                .model-response-text h1,
                .model-response-text h2,
                .model-response-text h3,
                .model-response-text h4,
                .model-response-text h5,
                .model-response-text h6 {
                    font-family: var(--w-font) !important;
                }
                
                /* 用户查询文本 */
                .query-text-line,
                .user-query-container .query-content,
                .user-query-container .query-text-line,
                .query-text.gds-body-l {
                    font-family: var(--w-font) !important;
                }
                
                /* 输入框 + Placeholder（含 Hint） */
                .ql-editor, .ql-editor *,
                .text-input-field, .text-input-field *,
                .input-area textarea, .input-area input,
                .input-area .text-input {
                    font-family: var(--w-font) !important;
                }
                .ql-editor::placeholder, .text-input-field::placeholder,
                textarea::placeholder, input::placeholder,
                .text-input::placeholder {
                    font-family: var(--w-font) !important;
                    opacity: 0.6;
                }
                
                /* 侧边栏文本 */
                bard-sidenav .conversation-title,
                bard-sidenav .conversation-title *,
                bard-sidenav .bot-name,
                bard-sidenav .gds-body-m,
                bard-sidenav .gds-body-s,
                bard-sidenav button,
                bard-sidenav span:not(.katex):not(.MathJax):not(mjx-container):not(.mat-icon):not(.material-icons):not([class*="icon"]):not(.gds-label-l),
                bard-sidenav .conversation-items-container,
                .explore-gems-container .gds-body-m {
                    font-family: var(--w-font) !important;
                }
                /* 仅覆盖选中会话的文本容器，避免破坏 Material Icons / SVG 图标字体。 */
                bard-sidenav .conversation.selected .conversation-title,
                bard-sidenav .conversation.selected .conversation-title span:not(.mat-icon):not(.material-icons):not([class*="icon"]):not(.gds-label-l),
                bard-sidenav .conversation.selected .gds-body-m,
                bard-sidenav .conversation.selected .gds-body-s,
                bard-sidenav .conversation.selected [class*="title"]:not(.mat-icon):not(.material-icons):not([class*="icon"]),
                .conversation.selected .conversation-title,
                .conversation.selected .conversation-title span:not(.mat-icon):not(.material-icons):not([class*="icon"]),
                .conversation.selected .gds-body-m,
                .conversation.selected .gds-body-s,
                .conversation.selected [class*="title"]:not(.mat-icon):not(.material-icons):not([class*="icon"]):not(.gds-label-l) {
                    font-family: var(--w-font) !important;
                }
                mat-icon,
                mat-icon *,
                .mat-icon,
                .mat-icon *,
                .material-icons,
                .material-icons *,
                [class*="icon"]:not(.wx-toc-item):not(.wx-font-btn):not(.wx-color-btn),
                [class*="icon"]:not(.wx-toc-item):not(.wx-font-btn):not(.wx-color-btn) * {
                    font-family: 'Google Symbols', 'Material Symbols Outlined', 'Material Icons', sans-serif !important;
                    font-feature-settings: 'liga' !important;
                }
                
                /* 界面按钮/标签/通用文本组件 */
                .mdc-button, .mdc-button span,
                .mat-mdc-button, .mat-mdc-button span,
                .gds-headline, .gds-title, 
                .gds-subtitle, .gds-caption,
                .gds-body-m, .gds-body-s, .gds-body-l,
                [role="button"] span,
                .action-button-text,
                .mat-mdc-list-item-content {
                    font-family: var(--w-font) !important;
                }
                
                /* 目录面板 / 设置面板 */
                #${CONSTANTS.TOC_PANEL_ID},
                #${CONSTANTS.TOC_PANEL_ID} .wx-toc-item,
                #${CONSTANTS.TOC_PANEL_ID} .wx-toc-title,
                #${CONSTANTS.TOC_PANEL_ID} .wx-toc-user,
                #${CONSTANTS.SETTING_PANEL_ID},
                #${CONSTANTS.SETTING_PANEL_ID} * {
                    font-family: var(--w-font) !important;
                }
                
                /* === 代码块字体隔离：强制继承网页默认等宽字体 === */
                code, code *,
                pre, pre *,
                .code-container, .code-container *,
                .code-block, .code-block *,
                .highlight, .highlight *,
                .code-container pre, .code-container code {
                    font-family: initial !important;
                    font-feature-settings: normal !important;
                    font-variation-settings: normal !important;
                }
                
                /* === 公式字体隔离：完全排除 --w-font 干扰 === */
                .katex, .katex *,
                .MathJax, .MathJax *,
                mjx-container, mjx-container *,
                math, math *,
                .math, .math *,
                .mwe-math-element, .mwe-math-element *,
                [class*="katex"], [class*="katex"] *,
                [class*="MathJax"], [class*="MathJax"] *,
                [class*="math"], [class*="math"] * {
                    font-family: revert !important;
                    font-style: revert !important;
                    font-weight: revert !important;
                    font-feature-settings: normal !important;
                    font-variation-settings: normal !important;
                }
                
                /* === 背景/布局/交互样式（保持原有逻辑） === */
                :root, body, .theme-host, :where(.theme-host) {
                    --bard-color-synthetic--chat-window-surface: var(--w-bg) !important;
                    --gem-sys-color--surface: var(--w-bg) !important;
                    --gem-sys-color--surface-variant: var(--w-bg) !important;
                    --gem-sys-color--surface-container: var(--w-bg) !important;
                    --gem-sys-color--surface-container-high: var(--w-bg) !important;
                    --gem-sys-color--surface-container-low: var(--w-bg) !important;
                    background-color: var(--w-bg) !important;
                    color: var(--w-text) !important;
                }
                gemini-app, main, infinite-scroller, .conversation-container, .response-container,
                .inner-container, .scroll-container, .input-area-container, .mat-drawer-container,
                mat-sidenav, .mat-drawer, .mat-drawer-inner-container, .chat-history,
                .explore-gems-container, conversations-list, bot-list, .overflow-container,
                mat-action-list, mat-nav-list, .conversation-items-container,
                side-nav-action-button, bard-sidenav, input-container {
                    background: transparent !important;
                    background-color: transparent !important;
                }
                .input-gradient, input-container.input-gradient { background: transparent !important; pointer-events: auto !important; }
                .top-gradient-container, .scroll-container::after, .scroll-container::before { display: none !important; }
                .input-area-container {
                    width: calc(100% - 32px) !important;
                    max-width: min(var(--w-max-width, 900px), calc(100% - 32px)) !important;
                    padding-bottom: 40px !important;
                    margin: 0 auto 10px auto !important;
                    box-sizing: border-box !important;
                }
                .input-area {
                    border-radius: 32px !important;
                    background-color: var(--w-input-bg) !important;
                    border: 1px solid rgba(0,0,0,0.08) !important;
                    overflow: hidden !important;
                    transition: background-color 0.3s;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.03) !important;
                    backdrop-filter: blur(10px) !important;
                }
                .text-input-field, .ql-editor, .ql-container { border-radius: 0 !important; background: transparent !important; border: none !important; }
                bard-sidenav .bot-new-conversation-button, bard-sidenav .mat-mdc-list-item-interactive,
                bard-sidenav button { background: transparent !important; border: none !important; box-shadow: none !important; }
                bard-sidenav .bot-new-conversation-button:hover, bard-sidenav .mat-mdc-list-item-interactive:hover {
                    background-color: rgba(0,0,0,0.05) !important; border-radius: 12px !important;
                }
                bard-sidenav .conversation.selected {
                    background-color: var(--w-accent-bg) !important;
                    border-radius: 12px !important;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.03) !important;
                }
                bard-sidenav, bard-sidenav span, bard-sidenav mat-icon, .conversation-title,
                .bot-name, .gds-body-m { color: var(--w-sidebar-text) !important; }
                .user-query-bubble-with-background, .user-query-container .query-content {
                    background-color: var(--w-accent-bg) !important;
                    color: var(--w-accent-text) !important;
                    border-radius: 16px !important;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04) !important;
                    border: 1px solid rgba(0,0,0,0.03) !important;
                }
                .query-text-line b, .query-text-line strong,
                .model-response-text b, .model-response-text strong {
                     font-weight: bold !important; color: inherit !important;
                }
                body[data-theme="dark"] h3, body[data-theme="dark"] ul, body[data-theme="dark"] ol,
                body[data-theme="dark"] li::marker { color: #e0e0e0 !important; }
                hallucination-disclaimer, .hallucination-disclaimer, .footer-container {
                    display: var(--w-footer-display) !important; opacity: 0.3;
                }
                main { transition: padding-right 0.4s cubic-bezier(0.2, 0, 0, 1) !important; box-sizing: border-box !important; }
                .conversation-container, .response-container, .inner-container {
                    max-width: var(--w-max-width, 900px) !important; margin: 0 auto !important;
                    transition: max-width 0.4s ease, margin 0.4s ease, width 0.4s ease !important;
                }
                body.toc-open main { padding-right: 320px !important; }
                body.toc-open .conversation-container, body.toc-open .response-container,
                body.toc-open .inner-container { width: auto !important; max-width: 900px !important; }
                .model-response-text h1, .model-response-text h2, .model-response-text h3,
                .user-query-container { scroll-margin-top: 80px !important; }
                
                /* === 公众号排版风格变量 === */
                body[data-pub-color="yellow"] { --w-pub-high: rgba(255, 235, 59, 0.6); --w-pub-accent: #fbc02d; --w-pub-text-on-high: #000; }
                body[data-theme="green"][data-pub-color="yellow"] { --w-pub-high: rgba(255, 215, 0, 0.6); --w-pub-accent: #f57f17; }
                body[data-theme="dark"][data-pub-color="yellow"] { --w-pub-high: rgba(255, 235, 59, 0.4); --w-pub-accent: #fff176; --w-pub-text-on-high: #fff; }
                body[data-pub-color="blue"] { --w-pub-high: rgba(144, 202, 249, 0.6); --w-pub-accent: #1976d2; --w-pub-text-on-high: #000; }
                body[data-theme="green"][data-pub-color="blue"] { --w-pub-high: rgba(33, 150, 243, 0.4); --w-pub-accent: #1565c0; }
                body[data-theme="dark"][data-pub-color="blue"] { --w-pub-high: rgba(66, 165, 245, 0.4); --w-pub-accent: #90caf9; --w-pub-text-on-high: #fff; }
                body[data-pub-color="pink"] { --w-pub-high: rgba(244, 143, 177, 0.6); --w-pub-accent: #d81b60; --w-pub-text-on-high: #000; }
                body[data-theme="green"][data-pub-color="pink"] { --w-pub-high: rgba(233, 30, 99, 0.3); --w-pub-accent: #ad1457; }
                body[data-theme="dark"][data-pub-color="pink"] { --w-pub-high: rgba(240, 98, 146, 0.4); --w-pub-accent: #f48fb1; --w-pub-text-on-high: #fff; }
                body[data-pub-color="green"] { --w-pub-high: rgba(165, 214, 167, 0.6); --w-pub-accent: #388e3c; --w-pub-text-on-high: #000; }
                body[data-theme="green"][data-pub-color="green"] { --w-pub-high: rgba(255, 255, 255, 0.5); --w-pub-accent: #2e7d32; }
                body[data-theme="dark"][data-pub-color="green"] { --w-pub-high: rgba(129, 199, 132, 0.4); --w-pub-accent: #a5d6a7; --w-pub-text-on-high: #fff; }
                
                /* === 公众号排版样式 === */
                body[data-public-style="true"] main h1, body[data-public-style="true"] .model-response-text h1,
                body[data-public-style="true"] main h2, body[data-public-style="true"] .model-response-text h2 {
                    border-left: 5px solid var(--w-pub-accent) !important;
                    background: linear-gradient(to right, rgba(0,0,0,0.03), transparent) !important;
                    padding: 10px 15px !important; border-radius: 0 8px 8px 0 !important;
                    margin-top: 30px !important; margin-bottom: 20px !important; font-weight: bold !important; color: inherit !important;
                }
                body[data-theme="dark"][data-public-style="true"] main h2 {
                    background: linear-gradient(to right, rgba(255,255,255,0.05), transparent) !important;
                }
                body[data-public-style="true"] main strong, body[data-public-style="true"] main b,
                body[data-public-style="true"] .model-response-text strong, body[data-public-style="true"] .model-response-text b {
                    padding: 0 3px !important; border-radius: 4px !important; color: inherit !important; background: none;
                }
                body[data-public-style="true"][data-pub-type="half"] main strong,
                body[data-public-style="true"][data-pub-type="half"] .model-response-text strong,
                body[data-public-style="true"][data-pub-type="half"] main b,
                body[data-public-style="true"][data-pub-type="half"] .model-response-text b {
                    background: linear-gradient(to bottom, transparent 55%, var(--w-pub-high) 0) !important;
                }
                body[data-public-style="true"][data-pub-type="full"] main strong,
                body[data-public-style="true"][data-pub-type="full"] .model-response-text strong,
                body[data-public-style="true"][data-pub-type="full"] main b,
                body[data-public-style="true"][data-pub-type="full"] .model-response-text b {
                    background-color: var(--w-pub-high) !important; color: var(--w-pub-text-on-high) !important;
                }
                body[data-public-style="true"] main blockquote, body[data-public-style="true"] .model-response-text blockquote {
                    background-color: rgba(0,0,0,0.03) !important; border-left: 4px solid var(--w-pub-accent) !important;
                    padding: 15px !important; border-radius: 8px !important; margin: 20px 0 !important;
                }
                body[data-theme="dark"][data-public-style="true"] main blockquote {
                    background-color: rgba(255,255,255,0.05) !important;
                }
                body[data-public-style="true"] main ul, body[data-public-style="true"] main ol,
                body[data-public-style="true"] .model-response-text ul, body[data-public-style="true"] .model-response-text ol {
                    background: rgba(0,0,0,0.02) !important; padding: 15px 15px 15px 35px !important;
                    border-radius: 10px !important; border: 1px dashed rgba(0,0,0,0.1) !important; margin-bottom: 20px !important;
                }
                body[data-theme="dark"][data-public-style="true"] main ul {
                    background: rgba(255,255,255,0.03) !important; border-color: rgba(255,255,255,0.1) !important;
                }
                
                /* === 用户消息操作按钮定位修复 === */
                .user-query-container .query-content {
                    position: relative !important;
                }
                .user-query-container .action-button-container {
                    position: absolute !important;
                    top: 100% !important;
                    bottom: auto !important;
                    transform: none !important;
                    margin: 4px 0 0 0 !important;
                    z-index: 1 !important;
                }
                .user-query-container .action-button-container:first-of-type {
                    right: 44px !important;
                }
                .user-query-container .action-button-container:last-of-type {
                    right: 0 !important;
                }
                .user-query-container .message-actions, .user-query-container .action-buttons {
                    background: transparent !important; backdrop-filter: none !important;
                    border-radius: 0 !important; padding: 0 !important; margin: 0 !important;
                    opacity: 1 !important; transform: none !important;
                }
                .user-query-bubble-with-background, .user-query-container .query-content {
                    padding-right: 0 !important;
                }
                
                /* === 悬浮球样式 === */
                #${CONSTANTS.FAB_ID} {
                    position: fixed; bottom: 80px; right: 30px; width: 44px; height: 44px;
                    background: #333; color: #fff; border-radius: 50%;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2); display: flex; align-items: center;
                    justify-content: center; cursor: move; z-index: 999999; font-size: 20px;
                    user-select: none; transition: opacity 0.3s; opacity: 0.4;
                }
                #${CONSTANTS.FAB_ID}:hover { opacity: 1; transform: scale(1.1); }
                #${CONSTANTS.TOC_FAB_ID} {
                    position: fixed; bottom: 135px; right: 30px; width: 44px; height: 44px;
                    background: #fff; color: #333; border: 1px solid #ddd; border-radius: 50%;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: flex; align-items: center;
                    justify-content: center; cursor: pointer; z-index: 999999; font-size: 18px;
                    user-select: none; transition: all 0.3s; opacity: 0.6;
                }
                #${CONSTANTS.TOC_FAB_ID}:hover { opacity: 1; transform: scale(1.1); box-shadow: 0 6px 16px rgba(0,0,0,0.15); }
                
                /* === 目录面板样式 === */
                #${CONSTANTS.TOC_PANEL_ID} {
                    position: fixed; top: 80px; right: -320px; width: var(--w-toc-width); max-height: 70vh;
                    background: rgba(255,255,255,0.95); backdrop-filter: blur(10px);
                    border-radius: 16px; box-shadow: 0 0 20px rgba(0,0,0,0.08); z-index: 999998;
                    padding: 20px 10px 20px 20px; overflow-y: auto;
                    transition: right 0.4s cubic-bezier(0.19, 1, 0.22, 1);
                    display: flex; flex-direction: column; gap: 8px; font-size: 14px; color: #333;
                    border: 1px solid rgba(0,0,0,0.05);
                }
                #${CONSTANTS.TOC_PANEL_ID}.active { right: 20px; }
                body[data-theme="dark"] #${CONSTANTS.TOC_PANEL_ID} {
                    background: rgba(30,30,30,0.95); border-color: rgba(255,255,255,0.1); color: #ccc;
                }
                .wx-toc-header {
                    display: flex; justify-content: space-between; align-items: center;
                    border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 10px; margin-bottom: 10px;
                }
                .wx-toc-title { font-weight: bold; font-size: 16px; }
                .wx-toc-close {
                    cursor: pointer; color: #999; font-size: 18px; width: 24px; height: 24px;
                    display: flex; align-items: center; justify-content: center; border-radius: 50%;
                    transition: background 0.2s;
                }
                .wx-toc-close:hover { background: rgba(0,0,0,0.05); color: #333; }
                .wx-toc-item {
                    cursor: pointer; padding: 6px 10px; border-radius: 6px;
                    transition: background 0.2s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .wx-toc-item:hover { background: rgba(0,0,0,0.05); }
                .wx-toc-h1 {
                    font-weight: bold; font-size: 14px; margin-top: 10px; color: var(--w-sidebar-text);
                    border-left: 3px solid var(--w-pub-accent); padding-left: 8px;
                }
                .wx-toc-h2 { padding-left: 20px; font-size: 13px; opacity: 0.9; }
                .wx-toc-h3 { padding-left: 35px; font-size: 12px; opacity: 0.7; }
                .wx-toc-user {
                    font-weight: bold; background: var(--w-accent-bg); color: var(--w-accent-text);
                    margin-top: 15px; margin-bottom: 5px; padding: 8px 10px; border-radius: 8px;
                    font-size: 13px; border: 1px solid rgba(0,0,0,0.05);
                }
                body[data-theme="dark"] .wx-toc-item:hover { background: rgba(255,255,255,0.1); }
                .wx-toc-empty { text-align: center; color: #999; margin-top: 20px; font-size: 13px; }
                
                /* === 设置面板样式 === */
                #${CONSTANTS.SETTING_PANEL_ID} {
                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    width: 380px; background: #fff; border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.25); padding: 25px; z-index: 1000000;
                    display: none; flex-direction: column; gap: 20px;
                    font-family: system-ui, -apple-system, sans-serif !important; color: #333;
                }
                #${CONSTANTS.SETTING_PANEL_ID}.active { display: flex; }
                #${CONSTANTS.OVERLAY_ID} {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.3); z-index: 999999; display: none; backdrop-filter: blur(2px);
                }
                #${CONSTANTS.OVERLAY_ID}.active { display: block; }
                .wx-row-label { font-size: 14px; color: #888; margin-bottom: 8px; }
                .wx-flex-row { display: flex; gap: 10px; align-items: center; }
                .wx-color-btn { flex: 1; height: 40px; border-radius: 10px; cursor: pointer; border: 2px solid transparent; }
                .wx-color-btn.active { border-color: #333; transform: scale(0.95); }
                .wx-font-btn {
                    flex: 1; padding: 10px 0; text-align: center; background: #f5f5f5;
                    border-radius: 12px; font-size: 13px; cursor: pointer; color: #333;
                }
                .wx-font-btn.active { background: #333; color: #fff; }
                .wx-num-input { width: 50px; padding: 5px; border: 1px solid #ddd; border-radius: 6px; text-align: center; }
                input[type=range] { flex: 1; accent-color: #333; }
                .wx-switch-row { display: flex; justify-content: space-between; align-items: center; margin-top: 5px; }
                .wx-style-dot {
                    width: 30px; height: 30px; border-radius: 50%; cursor: pointer;
                    border: 2px solid transparent; transition: transform 0.2s;
                    position: relative; box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }
                .wx-style-dot:hover { transform: scale(1.1); }
                .wx-style-dot.active { border-color: #333; transform: scale(1.1); }
                #wx-style-row {
                    display: none; margin-top: 10px; padding-left: 5px; gap: 15px;
                    align-items: center; justify-content: space-between;
                }
                #wx-style-row.visible { display: flex; animation: fadeIn 0.3s; }
                .wx-type-switch { display: flex; background: #f0f0f0; border-radius: 15px; padding: 2px; }
                .wx-type-btn {
                    padding: 4px 12px; font-size: 12px; cursor: pointer; border-radius: 12px;
                    color: #666; transition: all 0.2s;
                }
                .wx-type-btn.active { background: #fff; color: #000; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-weight: bold; }
                @keyframes fadeIn { from { opacity:0; transform:translateY(-5px); } to { opacity:1; transform:translateY(0); } }
            `;
        },

        _updateDynamicCSS(fontSize) {
            this.dynamicStyleEl.textContent = `
                main p, .model-response-text p { font-size: ${fontSize}px !important; }
            `;
        },

        cleanup() {
            if (this.dynamicStyleEl?.parentNode) {
                this.dynamicStyleEl.parentNode.removeChild(this.dynamicStyleEl);
            }
        }
    };

    // ========================================================================
    // === 内容渲染模块（Markdown 修复 + 目录增量更新） ===
    // ========================================================================
    const ContentRenderer = {
        processedNodes: new WeakSet(),

        cleanBold(rootNode) {
            if (!rootNode?.querySelectorAll) return;
            rootNode.querySelectorAll(CONSTANTS.SELECTORS.BOLD_ELEMENTS).forEach(el => {
                const text = el.textContent;
                if (text.length > 4 && text.startsWith('**') && text.endsWith('**')) {
                    el.textContent = text.slice(2, -2);
                }
            });
        },

        renderMarkdown(rootNode) {
            if (!rootNode?.querySelectorAll) return;
            const targets = rootNode.querySelectorAll(`${CONSTANTS.SELECTORS.QUERY_LINE}, ${CONSTANTS.SELECTORS.RESPONSE} p, ${CONSTANTS.SELECTORS.RESPONSE} li`);
            
            targets.forEach(el => {
                if (this.processedNodes.has(el)) return;
                if (!el.textContent?.includes('**')) return;

                const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
                const textNodes = [];
                let node;
                while ((node = walker.nextNode())) {
                    if (node.nodeValue.includes('**')) textNodes.push(node);
                }

                textNodes.forEach(textNode => {
                    const text = textNode.nodeValue;
                    const parts = text.split(/(\*\*[\s\S]+?\*\*)/g);
                    if (parts.length <= 1) return;

                    const fragment = document.createDocumentFragment();
                    parts.forEach(part => {
                        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                            const b = document.createElement('b');
                            b.textContent = part.slice(2, -2);
                            fragment.appendChild(b);
                        } else {
                            fragment.appendChild(document.createTextNode(part));
                        }
                    });
                    textNode.parentNode?.replaceChild(fragment, textNode);
                });
                this.processedNodes.add(el);
            });
        },

        generateToc(listContainer) {
            if (!listContainer) return;
            const main = document.querySelector(CONSTANTS.SELECTORS.MAIN);
            if (!main) {
                listContainer.replaceChildren(Utils.createElement('div', 'wx-toc-empty', '未找到内容'));
                return;
            }

            const nodes = main.querySelectorAll(`${CONSTANTS.SELECTORS.USER_QUERY}, ${CONSTANTS.SELECTORS.RESPONSE}`);
            if (!nodes.length) {
                listContainer.replaceChildren(Utils.createElement('div', 'wx-toc-empty', '暂无对话'));
                return;
            }

            const fragment = document.createDocumentFragment();
            let hasContent = false;
            const seenQueries = new Set();

            nodes.forEach(node => {
                if (node.classList.contains('query-text')) {
                    const lines = node.querySelectorAll(CONSTANTS.SELECTORS.QUERY_LINE);
                    const fullText = Array.from(lines).map(l => l.textContent).join(' ').trim().replace(/\s+/g, ' ');
                    if (!fullText || seenQueries.has(fullText)) return;
                    seenQueries.add(fullText);

                    const item = Utils.createElement('div', 'wx-toc-item wx-toc-user', 
                        fullText.substring(0, 15) + (fullText.length > 15 ? '...' : ''));
                    const target = node.closest('.user-query-container') || node;
                    item.onclick = () => Utils.smoothScroll(target);
                    fragment.appendChild(item);
                    hasContent = true;
                    this.renderMarkdown(node);
                }
                else if (node.classList.contains('model-response-text')) {
                    node.querySelectorAll(CONSTANTS.SELECTORS.HEADINGS).forEach(h => {
                        const text = h.textContent.trim();
                        if (!text) return;
                        const level = h.tagName === 'H2' ? 'wx-toc-h2' : h.tagName === 'H3' ? 'wx-toc-h3' : 'wx-toc-h1';
                        const item = Utils.createElement('div', `wx-toc-item ${level}`, text);
                        item.onclick = () => Utils.smoothScroll(h);
                        fragment.appendChild(item);
                        hasContent = true;
                    });
                    this.renderMarkdown(node);
                }
            });

            listContainer.replaceChildren(hasContent ? fragment : Utils.createElement('div', 'wx-toc-empty', '无标题可提取'));
        }
    };

    // ========================================================================
    // === UI 组件模块（事件委托 + 清理机制） ===
    // ========================================================================
    const UIManager = {
        eventHandlers: new Map(),

        init(cfg) {
            this._createFabs();
            this._createPanels();
            this._bindEvents();
            this.updateUIState(cfg);
            return this;
        },

        _createFabs() {
            if (document.getElementById(CONSTANTS.FAB_ID)) return;

            // 设置悬浮球
            const fab = Utils.createElement('div');
            fab.id = CONSTANTS.FAB_ID;
            fab.textContent = '⚙️';
            fab.title = '阅读设置';
            this._setupDraggable(fab);
            fab.onclick = (e) => { if (!fab.dataset.dragging) this.openSettings(); };
            document.body.appendChild(fab);

            // 目录悬浮球
            const tocFab = Utils.createElement('div');
            tocFab.id = CONSTANTS.TOC_FAB_ID;
            tocFab.textContent = '📑';
            tocFab.title = '内容目录';
            tocFab.onclick = () => TocManager.toggle();
            document.body.appendChild(tocFab);
        },

        _setupDraggable(el) {
            let isDragging = false, startX, startY, initialLeft, initialTop;
            
            const onMove = (e) => {
                if (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5) {
                    isDragging = true;
                    el.dataset.dragging = 'true';
                    el.style.left = (initialLeft + e.clientX - startX) + 'px';
                    el.style.top = (initialTop + e.clientY - startY) + 'px';
                    el.style.bottom = 'auto';
                    el.style.right = 'auto';
                }
            };
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                setTimeout(() => { delete el.dataset.dragging; }, 100);
            };

            el.onmousedown = (e) => {
                isDragging = false;
                startX = e.clientX; startY = e.clientY;
                initialLeft = el.offsetLeft; initialTop = el.offsetTop;
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            };
        },

        _createPanels() {
            if (document.getElementById(CONSTANTS.SETTING_PANEL_ID)) return;

            // 遮罩层
            const overlay = Utils.createElement('div');
            overlay.id = CONSTANTS.OVERLAY_ID;
            overlay.onclick = () => this.closeSettings();
            document.body.appendChild(overlay);

            // 设置面板
            const panel = Utils.createElement('div');
            panel.id = CONSTANTS.SETTING_PANEL_ID;
            
            // 关闭按钮
            const closeBtn = Utils.createElement('div', null, '✕');
            closeBtn.style.cssText = "position:absolute; top:20px; right:20px; cursor:pointer; font-weight:bold; color:#ccc; font-size:18px;";
            closeBtn.onclick = (e) => { e.stopPropagation(); this.closeSettings(); };
            panel.appendChild(closeBtn);

            // 配置项构建
            this._buildSettingRows(panel);
            document.body.appendChild(panel);

            // 目录面板
            TocManager.buildPanel();
        },

        _buildSettingRows(panel) {
            const cfg = ConfigManager.getAll();

            // 主题
            const row1 = Utils.createElement('div');
            row1.appendChild(Utils.createElement('div', 'wx-row-label', '背景主题'));
            const colorContainer = Utils.createElement('div', 'wx-flex-row');
            const colors = [
                { id: 'white', bg: '#fff', border: '1px solid #eee' },
                { id: 'yellow', bg: '#f6f1e7' },
                { id: 'green', bg: '#cce8cf' },
                { id: 'dark', bg: '#222' }
            ];
            colors.forEach(c => {
                const btn = Utils.createElement('div', 'wx-color-btn');
                btn.style.background = c.bg;
                if (c.border) btn.style.border = c.border;
                btn.dataset.val = c.id;
                btn.onclick = () => {
                    const newTheme = c.id;
                    const updates = { theme: newTheme };
                    if (newTheme !== 'dark' && cfg.autoWebDark) {
                        updates.userLightTheme = newTheme;
                        updates.autoWebDark = false;
                    } else if (newTheme === 'dark' && cfg.autoWebDark) {
                        updates.autoWebDark = false;
                    }
                    ConfigManager.batchUpdate(updates);
                };
                colorContainer.appendChild(btn);
            });
            row1.appendChild(colorContainer);
            panel.appendChild(row1);

            // 字号
            const row2 = Utils.createElement('div');
            row2.appendChild(Utils.createElement('div', 'wx-row-label', '字体大小 (px)'));
            const fontRow = Utils.createElement('div', 'wx-flex-row');
            const slider = Utils.createElement('input');
            slider.type = 'range'; slider.min = 14; slider.max = 30; slider.step = 1; slider.value = cfg.fontSize; slider.id = 'wx-fs-slider';
            const numInput = Utils.createElement('input', 'wx-num-input');
            numInput.type = 'number'; numInput.value = cfg.fontSize; numInput.id = 'wx-fs-input';
            
            const syncFontSize = (val) => {
                const num = parseInt(val) || 19;
                ConfigManager.set('fontSize', num);
                slider.value = num; numInput.value = num;
            };
            slider.oninput = (e) => syncFontSize(e.target.value);
            numInput.oninput = (e) => syncFontSize(e.target.value);
            
            fontRow.appendChild(Utils.createElement('span', null, 'A-'));
            fontRow.appendChild(slider);
            fontRow.appendChild(Utils.createElement('span', null, 'A+'));
            fontRow.appendChild(numInput);
            row2.appendChild(fontRow);
            panel.appendChild(row2);

            // 宽度
            const row4 = Utils.createElement('div');
            row4.appendChild(Utils.createElement('div', 'wx-row-label', '阅读宽度 (px)'));
            const widthRow = Utils.createElement('div', 'wx-flex-row');
            const wSlider = Utils.createElement('input');
            wSlider.type = 'range'; wSlider.min = 600; wSlider.max = 1600; wSlider.step = 50; wSlider.value = cfg.maxWidth; wSlider.id = 'wx-wd-slider';
            const wInput = Utils.createElement('input', 'wx-num-input');
            wInput.type = 'number'; wInput.value = cfg.maxWidth; wInput.id = 'wx-wd-input';
            
            const syncWidth = (val) => {
                const num = parseInt(val) || 900;
                ConfigManager.set('maxWidth', num);
                wSlider.value = num; wInput.value = num;
                document.querySelectorAll('.conversation-container, .response-container, .inner-container, .input-area-container')
                    .forEach(el => el.style.setProperty('--w-max-width', `${num}px`));
            };
            wSlider.oninput = (e) => syncWidth(e.target.value);
            wInput.oninput = (e) => syncWidth(e.target.value);
            
            widthRow.appendChild(Utils.createElement('span', null, '窄'));
            widthRow.appendChild(wSlider);
            widthRow.appendChild(Utils.createElement('span', null, '宽'));
            widthRow.appendChild(wInput);
            row4.appendChild(widthRow);
            panel.appendChild(row4);

            // 字体
            const row3 = Utils.createElement('div');
            row3.appendChild(Utils.createElement('div', 'wx-row-label', '字体风格'));
            const fontContainer = Utils.createElement('div', 'wx-flex-row');
            CONSTANTS.FONT_OPTIONS.forEach(f => {
                const btn = Utils.createElement('div', 'wx-font-btn', f.name);
                btn.dataset.val = f.id;
                btn.onclick = () => ConfigManager.set('fontType', f.id);
                fontContainer.appendChild(btn);
            });
            row3.appendChild(fontContainer);
            panel.appendChild(row3);

            // 开关项
            const switches = [
                { key: 'hideFooter', label: '隐藏底部免责声明' },
                { key: 'publicStyle', label: '公众号排版风格' },
                { key: 'autoWebDark', label: '跟随网页深色模式' }
            ];
            switches.forEach(({key, label}) => {
                const row = Utils.createElement('div', 'wx-switch-row');
                row.appendChild(Utils.createElement('span', null, label));
                const check = Utils.createElement('input');
                check.type = 'checkbox'; check.id = `wx-${key}-check`; check.checked = cfg[key];
                check.onchange = (e) => {
                    if (key === 'autoWebDark' && e.target.checked) {
                        DarkModeSync.sync();
                    }
                    ConfigManager.set(key, e.target.checked);
                };
                row.appendChild(check);
                panel.appendChild(row);
            });

            // 公众号样式子选项
            const rowStyle = Utils.createElement('div');
            rowStyle.id = 'wx-style-row';
            const colorZone = Utils.createElement('div', 'wx-flex-row'); colorZone.style.gap = '8px';
            const styles = [ { id: 'yellow', bg: '#fdd835' }, { id: 'blue', bg: '#64b5f6' }, { id: 'pink', bg: '#f06292' }, { id: 'green', bg: '#81c784' } ];
            styles.forEach(s => {
                const dot = Utils.createElement('div', 'wx-style-dot');
                dot.style.backgroundColor = s.bg;
                dot.dataset.val = s.id;
                dot.onclick = () => ConfigManager.set('publicColor', s.id);
                colorZone.appendChild(dot);
            });
            const typeSwitch = Utils.createElement('div', 'wx-type-switch');
            const typeHalf = Utils.createElement('div', 'wx-type-btn', '半覆盖');
            typeHalf.dataset.val = 'half';
            typeHalf.onclick = () => ConfigManager.set('publicType', 'half');
            const typeFull = Utils.createElement('div', 'wx-type-btn', '全覆盖');
            typeFull.dataset.val = 'full';
            typeFull.onclick = () => ConfigManager.set('publicType', 'full');
            typeSwitch.appendChild(typeHalf); typeSwitch.appendChild(typeFull);
            rowStyle.appendChild(colorZone); rowStyle.appendChild(typeSwitch);
            panel.appendChild(rowStyle);
        },

        _bindEvents() {
            // 配置变更监听：批量更新 UI
            ConfigManager.subscribe((cfg) => {
                StyleManager.applyTheme(cfg);
                this.updateUIState(cfg);
                // 动态更新布局宽度（依赖 CSS !important 规则，不再写 inline style 避免覆盖 toc-open 场景）
            });
        },

        updateUIState(cfg) {
            const panel = document.getElementById(CONSTANTS.SETTING_PANEL_ID);
            if (!panel) return;

            panel.querySelectorAll('.wx-color-btn').forEach(btn => 
                btn.classList.toggle('active', btn.dataset.val === cfg.theme));
            panel.querySelectorAll('.wx-font-btn').forEach(btn => 
                btn.classList.toggle('active', btn.dataset.val === cfg.fontType));
            
            const fsSlider = document.getElementById('wx-fs-slider');
            const fsInput = document.getElementById('wx-fs-input');
            if (fsSlider) fsSlider.value = cfg.fontSize;
            if (fsInput) fsInput.value = cfg.fontSize;
            
            const wdSlider = document.getElementById('wx-wd-slider');
            const wdInput = document.getElementById('wx-wd-input');
            if (wdSlider) wdSlider.value = cfg.maxWidth;
            if (wdInput) wdInput.value = cfg.maxWidth;

            ['hideFooter', 'publicStyle', 'autoWebDark'].forEach(key => {
                const el = document.getElementById(`wx-${key}-check`);
                if (el) el.checked = cfg[key];
            });

            const styleRow = document.getElementById('wx-style-row');
            if (styleRow) {
                styleRow.classList.toggle('visible', cfg.publicStyle);
            }
            panel.querySelectorAll('.wx-style-dot').forEach(dot => 
                dot.classList.toggle('active', dot.dataset.val === cfg.publicColor));
            panel.querySelectorAll('.wx-type-btn').forEach(btn => 
                btn.classList.toggle('active', btn.dataset.val === cfg.publicType));
        },

        openSettings() {
            const overlay = document.getElementById(CONSTANTS.OVERLAY_ID);
            const panel = document.getElementById(CONSTANTS.SETTING_PANEL_ID);
            if (overlay && panel) {
                overlay.classList.add('active');
                panel.classList.add('active');
                this.updateUIState(ConfigManager.getAll());
            }
        },

        closeSettings() {
            const overlay = document.getElementById(CONSTANTS.OVERLAY_ID);
            const panel = document.getElementById(CONSTANTS.SETTING_PANEL_ID);
            if (overlay) overlay.classList.remove('active');
            if (panel) panel.classList.remove('active');
        },

        cleanup() {
            this.eventHandlers.clear();
        }
    };

    // ========================================================================
    // === 目录管理模块 ===
    // ========================================================================
    const TocManager = {
        buildPanel() {
            if (document.getElementById(CONSTANTS.TOC_PANEL_ID)) return;
            const panel = Utils.createElement('div');
            panel.id = CONSTANTS.TOC_PANEL_ID;

            const header = Utils.createElement('div', 'wx-toc-header');
            const title = Utils.createElement('div', 'wx-toc-title', '目录');
            const close = Utils.createElement('div', 'wx-toc-close', '✕');
            close.title = "关闭目录";
            close.onclick = (e) => { e.stopPropagation(); this.toggle(); };

            header.appendChild(title);
            header.appendChild(close);
            panel.appendChild(header);

            const list = Utils.createElement('div');
            list.id = 'wx-toc-list';
            panel.appendChild(list);
            document.body.appendChild(panel);
        },

        toggle() {
            this.buildPanel();
            const panel = document.getElementById(CONSTANTS.TOC_PANEL_ID);
            const body = document.body;
            const isActive = panel.classList.contains('active');

            if (isActive) {
                panel.classList.remove('active');
                body.classList.remove('toc-open');
            } else {
                ContentRenderer.generateToc(document.getElementById('wx-toc-list'));
                panel.classList.add('active');
                body.classList.add('toc-open');
            }
        }
    };

    // ========================================================================
    // === 深色模式同步模块 ===
    // ========================================================================
    const DarkModeSync = {
        observer: null,

        init() {
            this.observer = new MutationObserver((mutations) => {
                mutations.forEach(m => {
                    if (m.attributeName === 'class') this.sync();
                });
            });
            this.observer.observe(document.body, { attributes: true });
            this.sync();
            return this;
        },

        sync() {
            const cfg = ConfigManager.getAll();
            if (!cfg.autoWebDark) return;

            const isDark = document.body.classList.contains('dark-theme');
            const targetTheme = isDark ? 'dark' : (cfg.userLightTheme || 'yellow');
            
            if (ConfigManager.get('theme') !== targetTheme) {
                ConfigManager.set('theme', targetTheme);
            }
        },

        cleanup() {
            this.observer?.disconnect();
        }
    };

    // ========================================================================
    // === 主入口 ===
    // ========================================================================
    function init() {
        try {
            // 1. 加载外部字体（异步 + 降级）
            Promise.all([
                Utils.loadStylesheet('https://cdn.jsdelivr.net/npm/lxgw-wenkai-screen-web/style.css'),
                Utils.loadStylesheet('https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,300..700;1,300..700&display=swap')
            ]).catch(() => console.warn('Some fonts failed to load, using fallback'));

            // 2. 初始化模块
            ConfigManager.init();
            StyleManager.init();
            UIManager.init(ConfigManager.getAll());
            DarkModeSync.init();

            // 3. 应用初始配置
            StyleManager.applyTheme(ConfigManager.getAll());

            // 4. 初始化观察者（精准观察 + 防抖）
            const target = document.querySelector(CONSTANTS.SELECTORS.MAIN) || document.body;
            const observer = new MutationObserver(Utils.debounce(() => {
                const main = document.querySelector(CONSTANTS.SELECTORS.MAIN);
                if (main) ContentRenderer.renderMarkdown(main);
                
                const tocPanel = document.getElementById(CONSTANTS.TOC_PANEL_ID);
                if (tocPanel?.classList.contains('active')) {
                    ContentRenderer.generateToc(document.getElementById('wx-toc-list'));
                }
                
                // 首页自动关闭目录
                if (window.location.href === 'https://gemini.google.com/app' && 
                    document.body.classList.contains('toc-open')) {
                    TocManager.toggle();
                }
            }, CONSTANTS.OBSERVER_DELAY));
            
            observer.observe(target, { 
                childList: true, 
                subtree: true,
                attributes: false,
                characterData: false
            });

            // 5. 非首页默认展开目录
            if (window.location.href !== 'https://gemini.google.com/app') {
                setTimeout(() => TocManager.toggle(), 500);
            }

            console.log('✓ Gemini UI Enhancer v1.0.16 loaded (Font Fix)');
        } catch (e) {
            console.error('Gemini UI Enhancer init failed:', e);
        }
    }

    // 延迟启动确保页面基础结构就绪
    setTimeout(init, 1500);

    // 页面卸载清理（可选）
    window.addEventListener('beforeunload', () => {
        StyleManager.cleanup();
        UIManager.cleanup();
        DarkModeSync.cleanup();
    });

})();
