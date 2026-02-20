import { describe, expect, it } from "vitest";
import { parseCommand } from "../lib/whatsappCommands";

describe("parseCommand", () => {
  describe("confirm_all", () => {
    it("parses 'CONFIRM'", () => {
      expect(parseCommand("CONFIRM")).toEqual({ type: "confirm_all" });
    });
    it("parses 'confirm' (case insensitive)", () => {
      expect(parseCommand("confirm")).toEqual({ type: "confirm_all" });
    });
    it("parses 'YES'", () => {
      expect(parseCommand("YES")).toEqual({ type: "confirm_all" });
    });
    it("parses 'yes'", () => {
      expect(parseCommand("yes")).toEqual({ type: "confirm_all" });
    });
    it("parses 'Y'", () => {
      expect(parseCommand("Y")).toEqual({ type: "confirm_all" });
    });
    it("parses 'OK'", () => {
      expect(parseCommand("OK")).toEqual({ type: "confirm_all" });
    });
    it("handles whitespace", () => {
      expect(parseCommand("  CONFIRM  ")).toEqual({ type: "confirm_all" });
    });
  });

  describe("confirm_specific", () => {
    it("parses 'CONFIRM 1,2,3'", () => {
      expect(parseCommand("CONFIRM 1,2,3")).toEqual({
        type: "confirm_specific",
        draftNumbers: [1, 2, 3],
      });
    });
    it("parses 'YES 1,2,3'", () => {
      expect(parseCommand("YES 1,2,3")).toEqual({
        type: "confirm_specific",
        draftNumbers: [1, 2, 3],
      });
    });
    it("parses space-separated numbers", () => {
      expect(parseCommand("CONFIRM 1 2 3")).toEqual({
        type: "confirm_specific",
        draftNumbers: [1, 2, 3],
      });
    });
    it("filters out invalid numbers", () => {
      expect(parseCommand("CONFIRM 1,0,-1,3")).toEqual({
        type: "confirm_specific",
        draftNumbers: [1, 3],
      });
    });
    it("handles single number", () => {
      expect(parseCommand("CONFIRM 5")).toEqual({
        type: "confirm_specific",
        draftNumbers: [5],
      });
    });
  });

  describe("cancel", () => {
    it("parses 'CANCEL'", () => {
      expect(parseCommand("CANCEL")).toEqual({ type: "cancel" });
    });
    it("parses 'cancel' (case insensitive)", () => {
      expect(parseCommand("cancel")).toEqual({ type: "cancel" });
    });
    it("parses 'NO'", () => {
      expect(parseCommand("NO")).toEqual({ type: "cancel" });
    });
    it("parses 'N'", () => {
      expect(parseCommand("N")).toEqual({ type: "cancel" });
    });
  });

  describe("entity_mapping", () => {
    it("parses 'TWINS = Emma & Niamh'", () => {
      expect(parseCommand("TWINS = Emma & Niamh")).toEqual({
        type: "entity_mapping",
        entityMapping: {
          rawText: "TWINS",
          playerNames: ["Emma", "Niamh"],
        },
      });
    });
    it("parses 'TWINS = Emma and Niamh'", () => {
      expect(parseCommand("TWINS = Emma and Niamh")).toEqual({
        type: "entity_mapping",
        entityMapping: {
          rawText: "TWINS",
          playerNames: ["Emma", "Niamh"],
        },
      });
    });
    it("parses with team context 'TWINS = Emma and Niamh U12'", () => {
      expect(parseCommand("TWINS = Emma and Niamh U12")).toEqual({
        type: "entity_mapping",
        entityMapping: {
          rawText: "TWINS",
          playerNames: ["Emma", "Niamh"],
          teamContext: "U12",
        },
      });
    });
    it("parses comma-separated names", () => {
      expect(parseCommand("the boys = John, James, Jack")).toEqual({
        type: "entity_mapping",
        entityMapping: {
          rawText: "the boys",
          playerNames: ["John", "James", "Jack"],
        },
      });
    });
  });

  describe("not a command (returns null)", () => {
    it("returns null for empty string", () => {
      expect(parseCommand("")).toBeNull();
    });
    it("returns null for normal text", () => {
      expect(parseCommand("Spent time on skills today")).toBeNull();
    });
    it("returns null for text with embedded CONFIRM", () => {
      expect(parseCommand("I need to CONFIRM the schedule")).toBeNull();
    });
    it("returns null for text with embedded YES", () => {
      expect(parseCommand("YES I think the training went well")).toBeNull();
    });
    it("returns null for null input", () => {
      expect(parseCommand(null as any)).toBeNull();
    });
    it("returns null for undefined input", () => {
      expect(parseCommand(undefined as any)).toBeNull();
    });
  });
});
