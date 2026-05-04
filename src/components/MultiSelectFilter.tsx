"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

interface MultiSelectFilterProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  theme?: 'LIGHT' | 'DARK';
  t: any;
}

const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  options,
  selected,
  onChange,
  placeholder,
  theme = 'DARK',
  t
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', minWidth: '160px' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '10px 12px',
          borderRadius: '10px',
          border: `1px solid ${t.border}`,
          background: t.bg,
          color: selected.length > 0 ? t.text : t.textMuted,
          fontSize: '0.875rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '42px',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? `0 0 0 2px ${theme === 'DARK' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.1)'}` : 'none'
        }}
      >
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
          {selected.length === 0 ? (
            <span>{placeholder}</span>
          ) : selected.length === 1 ? (
            <span style={{ color: t.text, fontWeight: 600 }}>{selected[0]}</span>
          ) : (
            <span style={{ 
              background: '#2563eb', 
              color: 'white', 
              padding: '2px 8px', 
              borderRadius: '6px', 
              fontSize: '0.75rem', 
              fontWeight: 700 
            }}>
              {selected.length} Selected
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selected.length > 0 && (
            <X 
              size={14} 
              onClick={clearAll}
              style={{ color: t.textMuted, opacity: 0.6 }}
              onMouseOver={e => e.currentTarget.style.opacity = '1'}
              onMouseOut={e => e.currentTarget.style.opacity = '0.6'}
            />
          )}
          <ChevronDown 
            size={16} 
            style={{ 
              transform: isOpen ? 'rotate(180deg)' : 'none', 
              transition: 'transform 0.2s ease',
              opacity: 0.7
            }} 
          />
        </div>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          background: theme === 'DARK' ? '#1e293b' : '#ffffff',
          borderRadius: '12px',
          border: `1px solid ${t.border}`,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          maxHeight: '300px',
          overflowY: 'auto',
          padding: '8px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            ::-webkit-scrollbar { width: 6px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: ${t.border}; borderRadius: 10px; }
          ` }} />
          
          <div 
            onClick={() => onChange([])}
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: selected.length === 0 ? 700 : 500,
              color: selected.length === 0 ? '#3b82f6' : t.text,
              background: selected.length === 0 ? (theme === 'DARK' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(37, 99, 235, 0.05)') : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '4px'
            }}
            onMouseOver={e => e.currentTarget.style.background = (theme === 'DARK' ? 'rgba(255,255,255,0.05)' : '#f8fafc')}
            onMouseOut={e => e.currentTarget.style.background = selected.length === 0 ? (theme === 'DARK' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(37, 99, 235, 0.05)') : 'transparent'}
          >
            <span>Show All</span>
            {selected.length === 0 && <Check size={16} />}
          </div>

          <div style={{ height: '1px', background: t.border, margin: '6px 0', opacity: 0.5 }}></div>

          {options.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <div
                key={option}
                onClick={() => toggleOption(option)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? '#3b82f6' : t.text,
                  background: isSelected ? (theme === 'DARK' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(37, 99, 235, 0.05)') : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '2px',
                  transition: 'all 0.1s ease'
                }}
                onMouseOver={e => e.currentTarget.style.background = isSelected ? (theme === 'DARK' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(37, 99, 235, 0.08)') : (theme === 'DARK' ? 'rgba(255,255,255,0.05)' : '#f8fafc')}
                onMouseOut={e => e.currentTarget.style.background = isSelected ? (theme === 'DARK' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(37, 99, 235, 0.05)') : 'transparent'}
              >
                <span style={{ 
                  whiteSpace: 'nowrap', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  marginRight: '8px'
                }}>
                  {option}
                </span>
                {isSelected && <Check size={16} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MultiSelectFilter;
