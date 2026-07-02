import { describe, expect, it } from 'vitest';
import {
  buildGreenPayload,
  EMPTY_GREEN_FORM,
  HABIT_CHANGES,
  VENEZUELA_STATES,
} from '../src/features/intake/green-form';

describe('buildGreenPayload', () => {
  it('includes contact, tags and habit changes; omits empty optionals', () => {
    const body = buildGreenPayload({
      ...EMPTY_GREEN_FORM,
      contact: ' 0414-1234567 ',
      tags: ['panic_attacks'],
      habitChanges: ['sueno', 'alimentacion'],
    });
    expect(body).toEqual({
      contacto: '0414-1234567',
      tags: ['panic_attacks'],
      cambio_habitos: ['sueno', 'alimentacion'],
    });
    expect('nombre' in body).toBe(false);
    expect('estado' in body).toBe(false);
  });

  it('includes name, estado and ciudad when provided', () => {
    const body = buildGreenPayload({
      ...EMPTY_GREEN_FORM,
      contact: '0212',
      name: ' Ana ',
      estado: 'Yaracuy',
      ciudad: ' San Felipe ',
    });
    expect(body.nombre).toBe('Ana');
    expect(body.estado).toBe('Yaracuy');
    expect(body.ciudad).toBe('San Felipe');
  });

  it('includes the preferred contact method when chosen, omits it otherwise (RF-1.3 screen 2)', () => {
    expect(
      buildGreenPayload({ ...EMPTY_GREEN_FORM, contact: '0212' }).metodo_contacto,
    ).toBeUndefined();
    const body = buildGreenPayload({
      ...EMPTY_GREEN_FORM,
      contact: '0212',
      contactMethod: 'whatsapp',
    });
    expect(body.metodo_contacto).toBe('whatsapp');
  });
});

describe('catalog constants', () => {
  it('lists the Venezuelan states and the five habit-change options', () => {
    expect(VENEZUELA_STATES).toContain('Yaracuy');
    expect(VENEZUELA_STATES).toContain('Distrito Capital');
    expect(VENEZUELA_STATES.length).toBe(24);
    expect(HABIT_CHANGES.map((h) => h.code)).toEqual([
      'alimentacion',
      'concentracion',
      'aseo',
      'relaciones',
      'sueno',
    ]);
  });
});
