import { describe, expect, it } from "vitest";
import { cell, readXlsxSheet } from "@/lib/xlsx";
import { TEMPLATE_PATH } from "@/lib/postplanner";

const grid = readXlsxSheet(TEMPLATE_PATH);

describe("reading Post Planner's template", () => {
  it("returns a grid with the rows the template has", () => {
    expect(grid.length).toBeGreaterThanOrEqual(11);
  });

  it("reads the comment-row explanation and version cell", () => {
    expect(cell(grid, 0, 0)).toMatch(/^## This is a comment row/);
    expect(cell(grid, 0, 1)).toBe("BULK UPLOAD VERSION 3.1 — Please DO NOT EDIT this cell.");
  });

  it("preserves the em dash, which is why the CSV needs a BOM", () => {
    expect(cell(grid, 0, 1)).toContain("—");
  });

  it("reads the nine header cells in order", () => {
    expect(grid[1].slice(0, 9)).toEqual([
      "## POSTING TIME",
      "CAPTION",
      "LINK",
      "MEDIA",
      "TITLE",
      "FIRST COMMENT",
      "FIRST COMMENT DELAY",
      "TOBI BACKGROUND",
      "REEL OR STORY",
    ]);
  });

  it("confirms the header row is itself a ## comment row", () => {
    // This is the whole reason parsing is positional rather than by name.
    expect(cell(grid, 1, 0).startsWith("##")).toBe(true);
  });

  it("reads their POSTING TIME examples verbatim", () => {
    // Row 5 and row 6 of the sheet (0-indexed 4 and 5).
    expect(cell(grid, 4, 0)).toBe("01/01/2030  8:15");
    expect(cell(grid, 5, 0)).toBe("07/04/2030  14:30");
  });

  it("shows their examples use two spaces and an unpadded hour", () => {
    expect(/^\d{2}\/\d{2}\/\d{4} {2}\d{1,2}:\d{2}$/.test(cell(grid, 4, 0))).toBe(true);
    expect(cell(grid, 4, 0)).not.toMatch(/ {2}0\d:/);
  });

  it("aligns self-closing cells with the right column", () => {
    // Regression guard: a naive `<c([^>]*)>` swallows a self-closing cell's
    // slash and runs on to the next cell's </c>, so row 5's FIRST COMMENT text
    // showed up under LINK. C5 and D5 are genuinely empty; F5 holds the text.
    expect(cell(grid, 4, 2)).toBe(""); // C5 LINK
    expect(cell(grid, 4, 3)).toBe(""); // D5 MEDIA
    expect(cell(grid, 4, 5)).toMatch(/^This is a first comment text/); // F5
  });

  it("documents a blank POSTING TIME as queueing rather than scheduling", () => {
    // Their row 7 example leaves A7 blank and describes a queued post.
    expect(cell(grid, 6, 0)).toBe("");
    expect(cell(grid, 6, 1)).toMatch(/queued/i);
  });

  it("documents the allowed first-comment delays", () => {
    expect(cell(grid, 2, 6)).toMatch(/Allowed values are\s+5,10,15, 30 and 60/);
  });

  it("documents the 200-per-file media limit", () => {
    expect(cell(grid, 2, 3)).toMatch(/limit media posts to 200 per bulk upload file/);
  });

  it("returns an empty string for cells past the end", () => {
    expect(cell(grid, 9999, 0)).toBe("");
    expect(cell(grid, 0, 99)).toBe("");
  });

  it("fails clearly on a file that is not a zip", () => {
    expect(() => readXlsxSheet("package.json")).toThrow(/not a zip archive/);
  });

  it("fails clearly when the file is missing", () => {
    expect(() => readXlsxSheet("reference/nope.xlsx")).toThrow(/Could not read/);
  });
});
