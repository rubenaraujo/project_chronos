const LOWER_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

export function titleCase(text) {
    return String(text ?? '')
        .toLowerCase()
        .replace(/\S+/g, (word, offset) =>
            offset > 0 && LOWER_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1),
        );
}
