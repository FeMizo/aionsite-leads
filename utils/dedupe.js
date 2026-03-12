const {
  normalizeEmail,
  normalizeName,
  normalizePhone,
} = require("./normalizers");

function buildBigrams(value) {
  const normalized = ` ${normalizeName(value)} `;
  const bigrams = [];

  for (let index = 0; index < normalized.length - 1; index += 1) {
    bigrams.push(normalized.slice(index, index + 2));
  }

  return bigrams;
}

function diceCoefficient(left, right) {
  const leftBigrams = buildBigrams(left);
  const rightBigrams = buildBigrams(right);

  if (!leftBigrams.length || !rightBigrams.length) {
    return 0;
  }

  const remaining = [...rightBigrams];
  let matches = 0;

  for (const bigram of leftBigrams) {
    const matchIndex = remaining.indexOf(bigram);

    if (matchIndex >= 0) {
      matches += 1;
      remaining.splice(matchIndex, 1);
    }
  }

  return (2 * matches) / (leftBigrams.length + rightBigrams.length);
}

function jaccardSimilarity(left, right) {
  const leftTokens = new Set(normalizeName(left).split(" ").filter(Boolean));
  const rightTokens = new Set(normalizeName(right).split(" ").filter(Boolean));

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  let intersection = 0;

  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  }

  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / union;
}

function areNamesSimilar(left, right) {
  const leftName = normalizeName(left);
  const rightName = normalizeName(right);

  if (!leftName || !rightName) {
    return false;
  }

  if (leftName === rightName) {
    return true;
  }

  if (leftName.length > 8 && rightName.includes(leftName)) {
    return true;
  }

  if (rightName.length > 8 && leftName.includes(rightName)) {
    return true;
  }

  return (
    diceCoefficient(leftName, rightName) >= 0.88 ||
    jaccardSimilarity(leftName, rightName) >= 0.8
  );
}

function findDuplicate(candidate, records) {
  const candidateEmail = normalizeEmail(candidate.email);
  const candidatePhone = normalizePhone(candidate.phone);
  const candidateName = normalizeName(candidate.name);

  for (const record of records) {
    const recordEmail = normalizeEmail(record.email);
    const recordPhone = normalizePhone(record.phone);
    const recordName = normalizeName(record.name);

    if (candidateEmail && recordEmail && candidateEmail === recordEmail) {
      return { reason: "email", existing: record };
    }

    if (candidatePhone && recordPhone && candidatePhone === recordPhone) {
      return { reason: "phone", existing: record };
    }

    if (candidateName && recordName && areNamesSimilar(candidateName, recordName)) {
      return { reason: "name", existing: record };
    }
  }

  return null;
}

function filterUniqueProspects(candidates, existingRecords) {
  const uniqueProspects = [];
  const duplicates = [];
  const comparisonPool = [...existingRecords];

  for (const candidate of candidates) {
    const duplicate = findDuplicate(candidate, comparisonPool);

    if (duplicate) {
      duplicates.push({
        candidate,
        reason: duplicate.reason,
        matchedWith: duplicate.existing.name || duplicate.existing.email || "",
      });
      continue;
    }

    uniqueProspects.push(candidate);
    comparisonPool.push(candidate);
  }

  return {
    uniqueProspects,
    duplicates,
  };
}

module.exports = {
  areNamesSimilar,
  filterUniqueProspects,
  findDuplicate,
};
