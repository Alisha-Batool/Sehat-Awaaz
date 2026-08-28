import { useTranslation } from 'react-i18next';

export default function Disclaimer() {
  const { t } = useTranslation();
  return (
    <div className="disclaimer" role="note" aria-label="Medical disclaimer">
      {t('disclaimer_text')}
    </div>
  );
}
