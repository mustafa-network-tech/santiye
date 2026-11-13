"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ImageUrlListInput({ values, onChange, disabled = false }: { values: string[]; onChange: (values: string[]) => void; disabled?: boolean }) {
  const rows = values.length > 0 ? values : [""];
  return (
    <div className="space-y-2">
      {rows.map((value, index) => (
        <div key={index} className="flex gap-2">
          <Input
            disabled={disabled}
            type="url"
            placeholder="https://..."
            value={value}
            onChange={(event) => onChange(rows.map((item, i) => (i === index ? event.target.value : item)))}
          />
          {rows.length > 1 && !disabled && (
            <Button type="button" variant="outline" size="icon" aria-label="Görseli kaldır" onClick={() => onChange(rows.filter((_, i) => i !== index))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, ""])}>
          <Plus className="h-4 w-4" />
          Görsel Ekle
        </Button>
      )}
    </div>
  );
}
