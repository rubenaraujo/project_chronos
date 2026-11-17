// Builds elements without ever parsing HTML, so API text can't inject markup.
export function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
        if (value === false || value == null) continue;
        if (key === 'class') el.className = value;
        else if (key === 'style') for (const [k, v] of Object.entries(value)) el.style.setProperty(k, v);
        else if (key === 'dataset') Object.assign(el.dataset, value);
        else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
        else el.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat()) {
        if (child == null || child === false) continue;
        el.append(child);
    }
    return el;
}

export const $ = (id) => document.getElementById(id);
