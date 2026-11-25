// The tools are kept apart (DECISIONS.md 40): no tool loads another tool's
// files, so what they share is copied into each tool's folder. These tests
// check that the copies are identical and that no tool reaches into another.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const rot = fileURLToPath(new URL("..", import.meta.url));

// A tool is a top-level folder with a calculation module.
const verktyg = readdirSync(rot).filter((namn) =>
  statSync(join(rot, namn)).isDirectory() && existsSync(join(rot, namn, "berakning.js")));

// Files every tool has its own copy of, and folders whose files must be
// identical wherever a tool has them.
const KRAVS_I_ALLA = ["delat.js"];
const DELADE_MAPPAR = ["typsnitt"];

// Git may check text files out with CRLF; compare them with LF.
function innehall(fil) {
  const data = readFileSync(fil);
  return /\.(woff2?|ttf|png|jpg)$/.test(fil) ? data : data.toString("utf8").replace(/\r\n/g, "\n");
}

function filerI(mapp) {
  return existsSync(mapp) ? readdirSync(mapp).filter((f) => statSync(join(mapp, f)).isFile()) : [];
}

test("det finns minst två verktyg att jämföra", () => {
  assert.ok(verktyg.length >= 2, `hittade bara ${verktyg.join(", ")}`);
});

for (const fil of KRAVS_I_ALLA) {
  test(`${fil} finns i alla verktyg och är identisk`, () => {
    const [forsta, ...ovriga] = verktyg;
    for (const v of verktyg) assert.ok(existsSync(join(rot, v, fil)), `${v}/${fil} saknas`);
    const facit = innehall(join(rot, forsta, fil));
    for (const v of ovriga) {
      assert.deepEqual(innehall(join(rot, v, fil)), facit, `${v}/${fil} skiljer sig från ${forsta}/${fil}`);
    }
  });
}

for (const mapp of DELADE_MAPPAR) {
  test(`filerna i ${mapp}/ är identiska i alla verktyg som har dem`, () => {
    const facit = new Map();
    for (const v of verktyg) {
      for (const fil of filerI(join(rot, v, mapp))) {
        const data = innehall(join(rot, v, mapp, fil));
        if (!facit.has(fil)) facit.set(fil, { v, data });
        else assert.deepEqual(data, facit.get(fil).data, `${v}/${mapp}/${fil} skiljer sig från ${facit.get(fil).v}/${mapp}/${fil}`);
      }
    }
  });
}

test("inget verktyg laddar filer från ett annat verktygs mapp", () => {
  for (const v of verktyg) {
    for (const fil of filerI(join(rot, v)).filter((f) => /\.(js|html|css)$/.test(f))) {
      const text = innehall(join(rot, v, fil));
      for (const annat of verktyg.filter((a) => a !== v)) {
        assert.ok(!text.includes(`../${annat}/`), `${v}/${fil} pekar in i ${annat}/`);
      }
    }
  }
});

test("delat.js: html, procent och kronor", async () => {
  const { html, procent, kronor } = await import(new URL("../itp/delat.js", import.meta.url));
  assert.equal(html(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  // toLocaleString puts a non-breaking space between thousands.
  const mellanslag = (s) => s.replace(/\s/g, " ");
  assert.equal(mellanslag(procent(0.0255, 2)), "2,55 %");
  assert.equal(mellanslag(procent(0.7)), "70 %");
  assert.equal(mellanslag(kronor(1234.6)), "1 235 kr");
});
