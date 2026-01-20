interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onSaveAsTemplate: () => void;
  onCancel: () => void;
}

export default function UnsavedChangesDialog({
  isOpen,
  onSave,
  onDiscard,
  onSaveAsTemplate,
  onCancel,
}: UnsavedChangesDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Несохраненные изменения
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          У вас есть несохраненные изменения. Что вы хотите сделать?
        </p>
        
        <div className="space-y-2">
          <button
            onClick={onSave}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Сохранить изменения
          </button>
          
          <button
            onClick={onSaveAsTemplate}
            className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Сохранить как шаблон
          </button>
          
          <button
            onClick={onDiscard}
            className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Не сохранять
          </button>
          
          <button
            onClick={onCancel}
            className="w-full text-gray-600 dark:text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
