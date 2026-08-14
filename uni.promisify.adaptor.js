uni.addInterceptor({
  returnValue(res) {
    if (!(!!res && typeof res.then === 'function')) {
      return res;
    }
    return new Promise((resolve, reject) => {
      res.then((res) => {
        if (!res) return resolve(null)
        if (res.statusCode !== 200) {
          reject(new Error(res.errMsg || 'request error'))
          return
        }
        resolve(res.data)
      });
    });
  },
});
