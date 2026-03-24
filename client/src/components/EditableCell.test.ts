import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EditableCell } from "./EditableCell";

describe("EditableCell Component", () => {
  it("should render the initial value", () => {
    const mockSave = vi.fn();
    render(
      <EditableCell value={10} onSave={mockSave} />
    );
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("should enter edit mode when clicked", async () => {
    const mockSave = vi.fn();
    render(
      <EditableCell value={10} onSave={mockSave} />
    );
    
    const cell = screen.getByText("10");
    fireEvent.click(cell);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue("10")).toBeInTheDocument();
    });
  });

  it("should save value on blur", async () => {
    const mockSave = vi.fn();
    render(
      <EditableCell value={10} onSave={mockSave} type="number" />
    );
    
    const cell = screen.getByText("10");
    fireEvent.click(cell);
    
    const input = screen.getByDisplayValue("10") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "20" } });
    fireEvent.blur(input);
    
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(20);
    });
  });

  it("should save value on Enter key", async () => {
    const mockSave = vi.fn();
    render(
      <EditableCell value={10} onSave={mockSave} type="number" />
    );
    
    const cell = screen.getByText("10");
    fireEvent.click(cell);
    
    const input = screen.getByDisplayValue("10") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "25" } });
    fireEvent.keyDown(input, { key: "Enter" });
    
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(25);
    });
  });

  it("should cancel edit on Escape key", async () => {
    const mockSave = vi.fn();
    render(
      <EditableCell value={10} onSave={mockSave} type="number" />
    );
    
    const cell = screen.getByText("10");
    fireEvent.click(cell);
    
    const input = screen.getByDisplayValue("10") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "30" } });
    fireEvent.keyDown(input, { key: "Escape" });
    
    await waitFor(() => {
      expect(mockSave).not.toHaveBeenCalled();
      expect(screen.getByText("10")).toBeInTheDocument();
    });
  });

  it("should not save if value hasn't changed", async () => {
    const mockSave = vi.fn();
    render(
      <EditableCell value={10} onSave={mockSave} type="number" />
    );
    
    const cell = screen.getByText("10");
    fireEvent.click(cell);
    
    const input = screen.getByDisplayValue("10") as HTMLInputElement;
    fireEvent.blur(input);
    
    await waitFor(() => {
      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  it("should handle text type", async () => {
    const mockSave = vi.fn();
    render(
      <EditableCell value="test" onSave={mockSave} type="text" />
    );
    
    const cell = screen.getByText("test");
    fireEvent.click(cell);
    
    const input = screen.getByDisplayValue("test") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "updated" } });
    fireEvent.blur(input);
    
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith("updated");
    });
  });

  it("should apply custom className", () => {
    const mockSave = vi.fn();
    const { container } = render(
      <EditableCell value={10} onSave={mockSave} className="custom-class" />
    );
    
    const cell = container.querySelector(".custom-class");
    expect(cell).toBeInTheDocument();
  });

  it("should use displayFormat if provided", () => {
    const mockSave = vi.fn();
    const displayFormat = (value: number | string) => `R$ ${value}`;
    
    render(
      <EditableCell value={100} onSave={mockSave} displayFormat={displayFormat} />
    );
    
    expect(screen.getByText("R$ 100")).toBeInTheDocument();
  });
});
