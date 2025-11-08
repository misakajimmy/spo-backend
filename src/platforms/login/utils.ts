import { BrowserContext } from "playwright";
import { LocalStorageItem, OriginData } from "../../types";

export async function getAllLocalStorageDeep(context: BrowserContext): Promise<OriginData[]> {
    const originsMap = new Map<string, LocalStorageItem[]>();

    const pages = context.pages();

    for (const page of pages) {
        const frames = page.frames();

        for (const frame of frames) {
            const frameUrl = frame.url();
            if (!frameUrl || frameUrl.startsWith('about:')) continue;

            const origin = new URL(frameUrl).origin;

            try {
                const storage = await frame.evaluate(() => {
                    const items: { name: string; value: string }[] = [];
                    // @ts-ignore
                    for (let i = 0; i < localStorage.length; i++) {
                        // @ts-ignore
                        const key = localStorage.key(i);
                        if (key) {
                            // @ts-ignore
                            items.push({ name: key, value: localStorage.getItem(key) ?? '' });
                        }
                    }
                    return items;
                });

                if (storage && storage.length > 0) {
                    // 合并相同 origin 的 localStorage
                    const existing = originsMap.get(origin) ?? [];
                    const merged = [
                        ...existing,
                        ...storage.filter(
                            item => !existing.some(e => e.name === item.name)
                        )
                    ];
                    originsMap.set(origin, merged);
                }
            } catch (err) {
                // 某些跨域或受限制的 frame 无法访问 localStorage，忽略
                console.warn(`⚠️ 无法访问 ${origin} 的 localStorage：`, (err as Error).message);
            }
        }
    }

    // 转换为期望的结构数组
    const origins: OriginData[] = [];
    for (const [origin, localStorage] of originsMap.entries()) {
        origins.push({ origin, localStorage });
    }

    return origins;
}