import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

const useFetch = (url, options = {}) => {
  const { immediate = true, params = {} } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const fetchData = useCallback(
    async (overrideUrl) => {
      const targetUrl = overrideUrl || url;
      if (!targetUrl) return;

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const response = await api.get(targetUrl, {
          params,
          signal: abortControllerRef.current.signal,
        });
        setData(response.data.data || response.data);
        return response.data;
      } catch (err) {
        if (err.name === 'AbortError' || err.name === 'CanceledError') {
          return null;
        }
        const errorMessage =
          err.response?.data?.message || err.message || 'Failed to fetch data';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [url, JSON.stringify(params)]
  );

  useEffect(() => {
    if (immediate && url) {
      fetchData();
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [url, JSON.stringify(params)]);

  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
};

export default useFetch;
