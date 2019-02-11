import jsc = require("jsverify");
import RandExp = require('randexp');
const { expect } = require("chai");
import { normalizePartialUriString as sut } from '../src/helpers';

const UnreservedCharacterString = jsc.bless<string>({
  generator: jsc.generator.bless(function(size) {
    return new RandExp(`[a-z0-9\-\._~]{0,${size}}`, 'i').gen();
  })
});

const ReservedCharacterString = jsc.string.smap(
  str => str.replace(/[a-z0-9\-\._~]/ig, ""),
  str => str
);

describe("Helpers", () => {
  describe("normalizePartialUriString", () => {
    it('should percent decode unreserved characters (auto cases)', () => {
      jsc.assert(
        jsc.forall(UnreservedCharacterString, (str) => {
          const escapedString = percentEncodeAllChars(str);
          return !jsc.throws(() => {
            expect(sut(escapedString)).to.equal(str);
          });
        }),
        { tests: 1500, size: Math.round(Math.random() * 50) }
      );
    }).timeout(Infinity);

    it('should percent decode unreserved characters (manual cases)', () => {
      expect(sut("f%61lse")).to.equal("false");
      expect(sut("%74rue")).to.equal("true");
      expect(sut("%6Eull")).to.equal("null");
      expect(sut("%6eull")).to.equal("null");
      expect(sut("n%75ll")).to.equal("null");
    });

    it("should not decode any other characters", () => {
      jsc.assert(
        jsc.forall(ReservedCharacterString, (str) => {
          const escapedString = percentEncodeAllChars(str);
          return !jsc.throws(() => {
            expect(sut(escapedString)).to.equal(escapedString);
          });
        }),
        { tests: 15000, size: Math.round(Math.random() * 50) }
      );
    }).timeout(Infinity);

    it("should not decode unencoded characters", () => {
      jsc.assert(
        jsc.forall(jsc.string, (str) => {
          // str could accidentally contain a percent-encoded character
          // (if it happens to end up with the character sequence % HEX HEX),
          // and we don't want to pass those in for this test. Howewer, we also
          // can't just call decodeURIComponent(str) to get the value with no
          // enocded characters, as that will fail if there's a literal % that
          // isn't followed by two hex digits. So, we write our own replacer.
          const unencodedString = str.replace(/\%[0-F][0-F]/ig, "");
          return !jsc.throws(() => {
            expect(sut(unencodedString)).to.equal(unencodedString);
          });
        })
      );
    })
  });
});

function percentEncodeAllChars(str: string) {
  return str
    .split('')
    .map(it => {
      const code = it.charCodeAt(0).toString(16);
      return `%${Math.random() > .5
        ? code.toLowerCase()
        : code.toUpperCase()}`;
    })
    .join('');
}
/*
function reallyShowString(str) {
  return [...str].map((it) => it.charCodeAt(0));
}*/
