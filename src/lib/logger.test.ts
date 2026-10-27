import { describe, it, expect } from 'vitest';
import { logger, createChildLogger } from './logger';

describe('Logger (Pino Observability)', () => {
  it('deve instanciar o logger principal', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('deve criar child logger com bindings corretos', () => {
    const child = createChildLogger('test-module', { requestId: '123' });
    expect(child).toBeDefined();
    expect(child.bindings().module).toBe('test-module');
    expect(child.bindings().requestId).toBe('123');
  });
});
