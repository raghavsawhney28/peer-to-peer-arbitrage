import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import axios from 'axios';
import './Import.css';

const Import = () => {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [availableFields, setAvailableFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [step, setStep] = useState('upload'); // upload, mapping, preview, import

  const onDrop = useCallback((acceptedFiles) => {
    const uploadedFile = acceptedFiles[0];
    setFile(uploadedFile);
    setStep('mapping');
    setError(null);
    setSuccess(null);
    
    // Load available fields for mapping
    loadAvailableFields();
    
    // Parse CSV for preview
    parseCSV(uploadedFile);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: false
  });

  const loadAvailableFields = async () => {
    try {
      const response = await axios.get('/api/import/fields');
      if (response.data.success) {
        setAvailableFields(response.data.fields);
        
        // Set default mapping
        const defaultMapping = {};
        response.data.fields.forEach(field => {
          defaultMapping[field.key] = field.key;
        });
        setColumnMapping(defaultMapping);
      }
    } catch (error) {
      setError('Failed to load field definitions');
    }
  };

  const parseCSV = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError('CSV parsing errors: ' + results.errors.map(e => e.message).join(', '));
          return;
        }
        
        setPreviewData({
          headers: results.meta.fields,
          rows: results.data.slice(0, 10), // Show first 10 rows
          total: results.data.length
        });
      },
      error: (error) => {
        setError('Failed to parse CSV: ' + error.message);
      }
    });
  };

  const handleColumnMappingChange = (fieldKey, csvColumn) => {
    setColumnMapping(prev => ({
      ...prev,
      [fieldKey]: csvColumn
    }));
  };

  const handlePreview = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', file);
      formData.append('columnMapping', JSON.stringify(columnMapping));

      const response = await axios.post('/api/import/preview', formData);
      
      if (response.data.success) {
        setPreviewData(response.data);
        setStep('preview');
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to preview CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', file);
      formData.append('columnMapping', JSON.stringify(columnMapping));

      const response = await axios.post('/api/import/import', formData);
      
      if (response.data.success) {
        setSuccess(response.data.message);
        setStep('import');
        setFile(null);
        setPreviewData(null);
        setColumnMapping({});
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to import CSV');
    } finally {
      setLoading(false);
    }
  };

  const downloadSample = async () => {
    try {
      const response = await axios.get('/api/import/sample', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sample-trades.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setError('Failed to download sample CSV');
    }
  };

  const resetImport = () => {
    setFile(null);
    setPreviewData(null);
    setColumnMapping({});
    setError(null);
    setSuccess(null);
    setStep('upload');
  };

  const renderUploadStep = () => (
    <div className="upload-step">
      <div className="upload-info">
        <h3>Upload CSV File</h3>
        <p>Upload a CSV file containing your P2P trade data. The file should include columns for order ID, side, price, amount, and other trade details.</p>
        
        <div className="sample-section">
          <p>Don't have a CSV file? Download our sample template:</p>
          <button className="btn btn-secondary" onClick={downloadSample}>
            Download Sample CSV
          </button>
        </div>
      </div>

      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        <div className="dropzone-content">
          <div className="dropzone-icon">📁</div>
          {isDragActive ? (
            <p>Drop the CSV file here...</p>
          ) : (
            <p>Drag and drop a CSV file here, or click to select</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderMappingStep = () => (
    <div className="mapping-step">
      <h3>Map CSV Columns</h3>
      <p>Map the columns in your CSV file to the required fields for the system.</p>

      <div className="mapping-grid">
        {availableFields.map(field => (
          <div key={field.key} className="mapping-row">
            <div className="field-info">
              <label className="field-label">
                {field.label}
                {field.required && <span className="required">*</span>}
              </label>
              <div className="field-description">{field.description}</div>
            </div>
            
            <select
              value={columnMapping[field.key] || ''}
              onChange={(e) => handleColumnMappingChange(field.key, e.target.value)}
              className="mapping-select"
            >
              <option value="">Select CSV column</option>
              {previewData?.headers?.map(header => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="mapping-actions">
        <button className="btn btn-secondary" onClick={resetImport}>
          Cancel
        </button>
        <button 
          className="btn btn-primary" 
          onClick={handlePreview}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Preview Data'}
        </button>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="preview-step">
      <h3>Preview Data</h3>
      <p>Review the parsed data before importing. Showing {previewData?.rows?.length || 0} of {previewData?.total || 0} rows.</p>

      {previewData?.rows && (
        <div className="preview-table">
          <table>
            <thead>
              <tr>
                {Object.keys(previewData.rows[0] || {}).map(header => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.rows.map((row, index) => (
                <tr key={index}>
                  {Object.values(row).map((value, cellIndex) => (
                    <td key={cellIndex}>{String(value)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="preview-actions">
        <button className="btn btn-secondary" onClick={() => setStep('mapping')}>
          Back to Mapping
        </button>
        <button 
          className="btn btn-primary" 
          onClick={handleImport}
          disabled={loading}
        >
          {loading ? 'Importing...' : 'Import Data'}
        </button>
      </div>
    </div>
  );

  const renderImportStep = () => (
    <div className="import-step">
      <div className="success-message">
        <div className="success-icon">✅</div>
        <h3>Import Successful!</h3>
        <p>{success}</p>
      </div>
      
      <button className="btn btn-primary" onClick={resetImport}>
        Import Another File
      </button>
    </div>
  );

  return (
    <div className="import">
      <div className="import-header">
        <h1>Import Trades</h1>
        <p>Import your P2P trade data from CSV files or sync with MEXC API</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      <div className="import-content">
        {step === 'upload' && renderUploadStep()}
        {step === 'mapping' && renderMappingStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'import' && renderImportStep()}
      </div>
    </div>
  );
};

export default Import;
