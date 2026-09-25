import {describe, expect, test} from "vitest";
import {
    findWordAt,
    getSuggestions,
    getWordRanges,
    isCorrectWord,
    replacementEnd,
    splitPossessive,
    wasWordEdited,
} from "./spellcheck";

const dictionary = (words: string[], suggestions: Record<string, string[]> = {}) => ({
    correct: (word: string) => words.includes(word),
    suggest: (word: string) => suggestions[word] ?? [],
});

describe("word parsing", () => {
    test("keeps straight and curly apostrophes inside words", () => {
        expect(getWordRanges("pleasure's author’s").map(range => range.word))
            .toEqual(["pleasure's", "author’s"]);
    });

    test("supports non-ASCII letters", () => {
        expect(getWordRanges("café naïve Ελληνικά").map(range => range.word))
            .toEqual(["café", "naïve", "Ελληνικά"]);
    });

    test("finds the whole possessive when right-clicking either side", () => {
        const text = "a pleasure's reward";
        expect(findWordAt(text, 4)?.word).toBe("pleasure's");
        expect(findWordAt(text, 11)?.word).toBe("pleasure's");
    });
});

describe("possessives", () => {
    test("accepts a possessive when its stem is in a dictionary", () => {
        expect(isCorrectWord("pleasure's", [dictionary(["pleasure"])])).toBe(true);
        expect(isCorrectWord("dogs'", [dictionary(["dogs"])])).toBe(true);
    });

    test("preserves the possessive suffix on suggestions", () => {
        const spellchecker = dictionary([], {pleazure: ["pleasure"]});
        expect(getSuggestions("pleazure's", [spellchecker])).toEqual(["pleasure's"]);
    });

    test("separates a possessive suffix from its stem", () => {
        expect(splitPossessive("Codex's")).toEqual({stem: "Codex", suffix: "'s"});
    });
});

describe("typing behavior", () => {
    const range = {from: 4, to: 9, word: "typed"};

    test("temporarily suppresses a word touched by an insertion", () => {
        expect(wasWordEdited(range, [{from: 9, to: 10}])).toBe(true);
    });

    test("does not suppress a word because of an unrelated edit", () => {
        expect(wasWordEdited(range, [{from: 12, to: 13}])).toBe(false);
    });

    test("does not depend on the cursor position", () => {
        expect(wasWordEdited(range, [])).toBe(false);
    });

    test("uses the stem as the explicit personal dictionary entry", () => {
        expect(splitPossessive("Codex's").stem).toBe("Codex");
    });
});

describe("replacement behavior", () => {
    test("places the cursor after a replacement", () => {
        expect(replacementEnd({line: 3, ch: 8}, "corrected"))
            .toEqual({line: 3, ch: 17});
    });
});
