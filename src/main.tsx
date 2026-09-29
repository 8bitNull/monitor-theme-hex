import {ErrorBoundary} from './components/ErrorBoundary'
import { tr } from './lib/i18n.ts'
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { defaults, parsePreferences } from "./lib/appearance";
import {fetchSiteConfig, loadSiteConfig} from './lib/siteConfig';
const root = createRoot(document.getElementById('root')!);
root.render(<div className="bootstrap-loading">{tr("\u6B63\u5728\u52A0\u8F7D\u2026")}</div>);
async function start() {
    let siteDefaults = defaults;
    const backendConfig = fetchSiteConfig();
    try {
        const response = await fetch('/theme-config.json', { signal: AbortSignal.timeout(3000), cache: 'no-cache' });
        if (response.ok)
            siteDefaults = parsePreferences(await response.text());
    }
    catch { /* Missing or invalid site defaults never prevent the dashboard loading. */ }
    siteDefaults = await loadSiteConfig(siteDefaults, backendConfig);
    root.render(<StrictMode><ErrorBoundary><App siteDefaults={siteDefaults}/></ErrorBoundary></StrictMode>);
}
void start();
