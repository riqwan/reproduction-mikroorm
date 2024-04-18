import {
  Entity,
  ManyToOne,
  MikroORM,
  PrimaryKey,
  Property,
  Unique,
} from "@mikro-orm/postgresql";

@Entity()
@Unique({
  properties: ["parent_category_id", "rank"],
})
class ProductCategory {
  @PrimaryKey()
  id!: number;

  @Property({ columnType: "numeric", nullable: false, default: 0 })
  rank: number;

  @ManyToOne(() => ProductCategory, {
    columnType: "integer",
    fieldName: "parent_category_id",
    nullable: true,
    mapToPk: true,
  })
  parent_category_id?: number | null;

  constructor(rank: number) {
    this.rank = rank;
  }
}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: "test-db",
    entities: [ProductCategory],
    debug: ["query", "query-params"],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

test("basic CRUD example", async () => {
  const manager = orm.em;
  const parent = manager.create(ProductCategory, {
    rank: 1,
    parent_category_id: null,
  });

  await manager.flush();

  manager.create(ProductCategory, {
    rank: 1,
    parent_category_id: parent.id,
  });
  manager.create(ProductCategory, {
    rank: 2,
    parent_category_id: parent.id,
  });

  await manager.flush();

  await manager.fork().transactional(async (em) => {
    const [parent, cat1, cat2] = await manager.findAll(ProductCategory, {});

    cat1.rank = 2;
    em.persist(cat1);

    cat2.rank = 1;
    em.persist(cat2);
  });

  const [_, cat1, cat2] = await manager.fork().findAll(ProductCategory, {});

  expect(cat1.rank).toEqual(2);
  expect(cat2.rank).toEqual(1);
});
