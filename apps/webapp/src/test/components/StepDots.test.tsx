import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { StepDots } from '../../components/StepDots';

describe('StepDots', () => {
  it('should render 4 dots by default', () => {
    const { container } = render(<StepDots currentStep={1} />);
    // Target the dots via the outer div's children
    const dots = container.querySelectorAll('.mb-4 > div');
    expect(dots).toHaveLength(4);
  });

  it('should render correct number of dots when totalSteps is specified', () => {
    const { container } = render(<StepDots currentStep={1} totalSteps={6} />);
    const dots = container.querySelectorAll('.mb-4 > div');
    expect(dots).toHaveLength(6);
  });

  it('should mark active dot as wider and purple', () => {
    const { container } = render(<StepDots currentStep={2} />);
    const dots = container.querySelectorAll('.mb-4 > div');

    // Active dot (step 2, index 1) should have w-4 and be purple
    expect(dots[1].className).toContain('w-4');
    expect(dots[1].className).toContain('bg-[#5B5FC7]');

    // Done dot (step 1, index 0) should be purple
    expect(dots[0].className).toContain('bg-[#5B5FC7]');
  });

  it('should mark pending dots as gray', () => {
    const { container } = render(<StepDots currentStep={1} />);
    const dots = container.querySelectorAll('.mb-4 > div');

    // Pending dot (index 1) should be gray and not purple
    expect(dots[1].className).toContain('bg-gray-200');
    expect(dots[1].className).not.toContain('bg-[#5B5FC7]');
  });
});
