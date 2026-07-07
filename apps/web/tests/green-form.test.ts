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

  it('sends the beneficiary age so a minor routes to a child specialist (RF-1.3)', () => {
    expect(buildGreenPayload({ ...EMPTY_GREEN_FORM, contact: '0212', age: '8' }).edad).toBe(8);
    expect(buildGreenPayload({ ...EMPTY_GREEN_FORM, contact: '0212', age: '34' }).edad).toBe(34);
    // 0 is a valid minor age (newborn) and must still be sent.
    expect(buildGreenPayload({ ...EMPTY_GREEN_FORM, contact: '0212', age: '0' }).edad).toBe(0);
  });

  it('omits a blank, out-of-range or non-numeric age instead of sending garbage', () => {
    for (const age of ['', '200', '-1', 'abc']) {
      expect('edad' in buildGreenPayload({ ...EMPTY_GREEN_FORM, contact: '0212', age })).toBe(false);
    }
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
