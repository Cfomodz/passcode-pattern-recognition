import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { TapGrid } from '../../src/components/TapGrid';

describe('TapGrid', () => {
  it('renders without crashing', () => {
    const { getByLabelText } = render(
      <TapGrid onTap={() => {}} isActive={true} />
    );
    expect(getByLabelText('Tap capture grid')).toBeInTheDocument();
  });

  it('captures tap coordinates', () => {
    const handleTap = vi.fn();
    const { getByLabelText } = render(
      <TapGrid onTap={handleTap} isActive={true} />
    );
    
    const grid = getByLabelText('Tap capture grid');
    
    // Mock getBoundingClientRect
    vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 100,
      width: 300,
      height: 400,
      right: 400,
      bottom: 500,
      x: 100,
      y: 100,
      toJSON: () => {}
    });

    fireEvent.pointerDown(grid, {
      clientX: 150,
      clientY: 150
    });

    expect(handleTap).toHaveBeenCalledTimes(1);
    expect(handleTap).toHaveBeenCalledWith(
      { x: 50, y: 50 }, // 150 - 100
      { width: 300, height: 400 } // grid bounds from getBoundingClientRect
    );
  });

  it('ignores taps when not active', () => {
    const handleTap = vi.fn();
    const { getByLabelText } = render(
      <TapGrid onTap={handleTap} isActive={false} />
    );
    
    const grid = getByLabelText('Tap capture grid');
    
    fireEvent.pointerDown(grid, { clientX: 150, clientY: 150 });
    
    expect(handleTap).not.toHaveBeenCalled();
  });
});
