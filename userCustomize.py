import redis
import nltk

pool_ho = redis.ConnectionPool(host='localhost', port=6379, db=3)

def userCustomize(hint, optionstr):
   # redis_ho = redis.Redis(connection_pool=pool_ho)
   # redis_ho.zincrby(hint, nltk.word_tokenize(optionstr), 1)
