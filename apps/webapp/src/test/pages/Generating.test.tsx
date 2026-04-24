import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';
import { Generating } from '../../pages/Generating';

describe('Generating', () => {
  it('should render header', () => {
    render(<Generating />);
    expect(screen.getByText('Генерация')).toBeInTheDocument();
  });

  it('should show status message', () => {
    render(<Generating />);
    expect(screen.getByText('Создаём трек...')).toBeInTheDocument();
  });

  it('should show ETA', () => {
    render(<Generating />);
    expect(screen.getByText(/Осталось.+38/i)).toBeInTheDocument();
  });

  it('should render 5 stages', () => {
    render(<Generating />);
    expect(screen.getByText('Промпт улучшен')).toBeInTheDocument();
    expect(screen.getByText('Задача в очереди Lyria 3')).toBeInTheDocument();
    expect(screen.getByText('Генерация аудио')).toBeInTheDocument();
    expect(screen.getByText('Сохранение в облако')).toBeInTheDocument();
    expect(screen.getByText('Отправка в Telegram')).toBeInTheDocument();
  });
});
