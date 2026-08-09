import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  buildAssessmentResult,
  type PurposeProgress,
  type Replaceability,
} from '../../domain/assessment';
import { ResultSummary } from './ResultSummary';

describe('GFR-G1R2 利用価値の見直し余地を説明する', () => {
  it.each([
    ['achieved', 'easy', '入会目的は実現できていますが、同じ目的を他でも代替しやすいという入力です。'],
    ['partly', 'possible', '入会目的は一部実現できています。他での代替は「代替できるが手間がある」という入力です。'],
    ['hardly', 'hard', '入会目的はほとんど実現できていませんが、同じ目的を他では代替しにくいという入力です。'],
  ] as const)('%s × %s の根拠を入力どおりに示す', (progress, replaceability, reason) => {
    const result = buildAssessmentResult({
      fees: { monthlyFeeYen: 8_000, monthlyFixedFeeYen: 0, annualFeeYen: 0 },
      visits: null,
      benchmark: { kind: 'monthly-limit', amountYen: 9_000 },
      purpose: 'exercise-habit',
      purposeProgress: progress as PurposeProgress,
      replaceability: replaceability as Replaceability,
    });

    render(
      <ResultSummary
        result={result}
        headingRef={createRef<HTMLHeadingElement>()}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByText(reason)).toBeInTheDocument();
  });
});
