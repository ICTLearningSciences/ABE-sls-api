/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { RetrievalFilter } from '@aws-sdk/client-bedrock-agent-runtime';

/**
 * Builds AWS Knowledge Base retrieval filter from key-value pairs.
 * For fields with multiple values, creates an OR condition.
 * Multiple fields are combined with AND.
 */
export function buildFilter(
  filters?: Record<string, string | string[]>
): RetrievalFilter | undefined {
  if (!filters || Object.keys(filters).length === 0) {
    return undefined;
  }

  const andConditions: RetrievalFilter[] = [];

  for (const [field, value] of Object.entries(filters)) {
    const values = Array.isArray(value) ? value : [value];

    if (values.length === 0) {
      continue;
    }

    if (values.length === 1) {
      // Single value: use equals
      andConditions.push({
        equals: {
          key: field,
          value: values[0],
        },
      });
    } else {
      // Multiple values for same field: use OR (orAll)
      andConditions.push({
        orAll: values.map((v) => ({
          equals: {
            key: field,
            value: v,
          },
        })),
      });
    }
  }

  if (andConditions.length === 0) {
    return undefined;
  }

  if (andConditions.length === 1) {
    return andConditions[0];
  }

  // Multiple fields: combine with AND
  return {
    andAll: andConditions,
  };
}
