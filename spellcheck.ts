export interface WordRange {
    from: number;
    to: number;
    word: string;
}

export interface OffsetRange {
    from: number;
    to: number;
}

export interface Spellchecker {
    correct(word: string): boolean;
    suggest(word: string): string[];
}

const WORD_PATTERN = /[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu;

export function getWordRanges(text: string, offset = 0): WordRange[] {
    const ranges: WordRange[] = [];
    const matcher = new RegExp(WORD_PATTERN.source, WORD_PATTERN.flags);
    let match: RegExpExecArray | null;

    while ((match = matcher.exec(text)) !== null) {
        ranges.push({
            from: offset + match.index,
            to: offset + match.index + match[0].length,
            word: match[0],
        });
    }

    return ranges;
}

export function findWordAt(text: string, position: number): WordRange | undefined {
    return getWordRanges(text).find(({from, to}) => position >= from && position <= to);
}

export function splitPossessive(word: string): {stem: string; suffix: string} {
    const singular = word.match(/['’]s$/iu);
    if (singular && singular.index !== undefined && singular.index > 0) {
        return {stem: word.slice(0, singular.index), suffix: singular[0]};
    }

    const plural = word.match(/['’]$/u);
    if (plural && plural.index !== undefined && plural.index > 0 && word[plural.index - 1]?.toLowerCase() === "s") {
        return {stem: word.slice(0, plural.index), suffix: plural[0]};
    }

    return {stem: word, suffix: ""};
}

export function isCorrectWord(word: string, spellcheckers: Spellchecker[]): boolean {
    if (spellcheckers.some(spellchecker => spellchecker.correct(word))) {
        return true;
    }

    const {stem, suffix} = splitPossessive(word);
    return suffix.length > 0 && spellcheckers.some(spellchecker => spellchecker.correct(stem));
}

export function getSuggestions(word: string, spellcheckers: Spellchecker[]): string[] {
    const {stem, suffix} = splitPossessive(word);
    const suggestions = spellcheckers.flatMap(spellchecker => spellchecker.suggest(stem));
    return suggestions.map(suggestion => `${suggestion}${suffix}`);
}

export function wasWordEdited(range: WordRange, edits: readonly OffsetRange[]): boolean {
    return edits.some(edit =>
        range.from <= edit.to && range.to >= edit.from
    );
}

export function replacementEnd(
    start: {line: number; ch: number},
    replacement: string,
): {line: number; ch: number} {
    const lines = replacement.split("\n");
    if (lines.length === 1) {
        return {line: start.line, ch: start.ch + replacement.length};
    }

    return {line: start.line + lines.length - 1, ch: lines[lines.length - 1].length};
}
