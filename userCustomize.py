import redis

pool_ho = redis.ConnectionPool(host='localhost', port=6379, db=3)

def userCustomize(hint, options):
    redis_ho = redis.Redis(connection_pool=pool_ho)
    redis_ho.zincrby(hint, options, 5)
