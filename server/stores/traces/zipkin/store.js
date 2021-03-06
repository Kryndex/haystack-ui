/*
 * Copyright 2017 Expedia, Inc.
 *
 *         Licensed under the Apache License, Version 2.0 (the "License");
 *         you may not use this file except in compliance with the License.
 *         You may obtain a copy of the License at
 *
 *             http://www.apache.org/licenses/LICENSE-2.0
 *
 *         Unless required by applicable law or agreed to in writing, software
 *         distributed under the License is distributed on an "AS IS" BASIS,
 *         WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *         See the License for the specific language governing permissions and
 *         limitations under the License.
 */

const axios = require('axios');
const Q = require('q');
const config = require('../../../config/config');
const converter = require('./converter');
const errorConverter = require('../../utils/errorConverter');
const objectUtils = require('../../utils/objectUtils');

const store = {};
const baseZipkinUrl = config.stores.traces.zipkinUrl;

const reservedField = ['serviceName', 'operationName', 'startTime', 'endTime', 'limit'];
const DEFAULT_RESULTS_LIMIT = 40;

function toAnnotationQuery(query) {
  return Object
    .keys(query)
    .filter(key => query[key] && !reservedField.includes(key))
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
    .join(' ');
}

function mapQueryParams(query) {
    const mappedQuery = {
        serviceName: query.serviceName,
        spanName: query.operationName ? query.operationName : 'all',
        annotationQuery: toAnnotationQuery(query),
        endTs: (parseInt(query.endTime, 10) - (30 * 1000 * 1000)) / 1000,
        lookback: (parseInt(query.endTime, 10) - parseInt(query.startTime, 10)) / 1000,
        limit: parseInt(query.limit, 10) || DEFAULT_RESULTS_LIMIT
    };

    return Object
        .keys(mappedQuery)
        .filter(key => mappedQuery[key])
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(mappedQuery[key])}`)
        .join('&');
}

store.getServices = () => {
    const deferred = Q.defer();
    axios
        .get(`${baseZipkinUrl}/services`)
        .then(response => deferred.resolve(response.data),
            error => deferred.reject(errorConverter.fromAxiosError(error)));

    return deferred.promise;
};

store.getOperations = (serviceName) => {
    const deferred = Q.defer();

    axios
        .get(`${baseZipkinUrl}/spans?serviceName=${serviceName}`)
        .then(response => deferred.resolve(response.data),
            error => deferred.reject(errorConverter.fromAxiosError(error)));

    return deferred.promise;
};

store.getTrace = (traceId) => {
    const deferred = Q.defer();

    axios
        .get(`${baseZipkinUrl}/trace/${traceId}`)
        .then(response => deferred.resolve(converter.toHaystackTrace(response.data)),
            error => deferred.reject(errorConverter.fromAxiosError(error)));

    return deferred.promise;
};

store.getRawTrace = (traceId) => {
    const deferred = Q.defer();

    axios
        .get(`${baseZipkinUrl}/trace/raw/${traceId}`)
        .then(response => deferred.resolve(response.data),
            error => deferred.reject(errorConverter.fromAxiosError(error)));

    return deferred.promise;
};

store.getRawSpan = (traceId, spanId) => {
    const deferred = Q.defer();

    axios
        .get(`${baseZipkinUrl}/trace/raw/${traceId}/${spanId}`)
        .then(response => deferred.resolve(response.data),
            error => deferred.reject(errorConverter.fromAxiosError(error)));

    return deferred.promise;
};

store.findTraces = (query) => {
    const deferred = Q.defer();
    const traceId = objectUtils.getPropIgnoringCase(query, 'traceId');

    if (traceId) {
        // if search is for a trace perform getTrace instead of search
        axios
            .get(`${baseZipkinUrl}/trace/${traceId}`)
            .then(response => deferred.resolve(converter.toHaystackSearchResult([response.data], query)),
                error => deferred.reject(errorConverter.fromAxiosError(error)));
    } else {
        const queryUrl = mapQueryParams(query);

        axios
            .get(`${baseZipkinUrl}/traces?${queryUrl}`)
            .then(response => deferred.resolve(converter.toHaystackSearchResult(response.data, query)),
                error => deferred.reject(errorConverter.fromAxiosError(error)));
    }

    return deferred.promise;
};


module.exports = store;
